We're going to create a preset patch using this guide.

Technical Specification for OP-XY Patch JSON File Format

1. Introduction

1.1 Purpose
The purpose of this document is to provide a comprehensive technical specification for the JSON file format used to store and exchange patch data on the OP-XY device. This specification aims to standardize the structure and content of patch files, ensuring compatibility and consistency across different patches, whether they are synth presets, drum kits, or sample-based instruments. By adhering to this format, developers, sound designers, and users can create, modify, and share patches efficiently and reliably.

1.2 Overview
The OP-XY is a versatile music production device that allows users to create and manipulate a wide range of sounds using various synth engines, samplers, effects, and modulation sources. Patches on the OP-XY encapsulate all the settings and parameters that define a particular sound or instrument. These patches are stored as JSON files, a lightweight and human-readable format that facilitates easy editing and sharing.

This specification outlines the structure of these JSON patch files, detailing each section and parameter. It covers common top-level fields, engine-specific settings, envelope configurations, effects, LFOs, modulation routings, sampling parameters, and global settings. By following this specification, users can ensure that patches are correctly interpreted by the OP-XY device and remain compatible with future updates and software versions.

2. File Structure
2.1 JSON Format

OP-XY patch files are stored in the JSON (JavaScript Object Notation) format. JSON is chosen for its simplicity, readability, and wide support across programming languages and platforms. The JSON files adhere to the following conventions:

Encoding: UTF-8 character encoding.
Structure: Consist of key-value pairs and arrays, representing various parameters and settings.
Field Naming:
Use snake_case for field names (e.g., "modulation_amount").
Dot notation in field names is not supported; nested objects should be used instead.
Data Types:
Use appropriate data types as specified (integers, floats, booleans, strings).
Comments: JSON does not support comments. Any annotations should be kept outside the JSON file.
Versioning:

Each patch file includes a "version" field indicating the format version. This ensures compatibility and allows the device to handle patches created with different firmware or software versions.

2.2 Root Elements

The root of the JSON file is a single object containing several top-level keys. The primary root elements include:

"engine": Defines the synth engine or sampler used and its parameters.
"envelope": Contains envelope settings for amplitude and filters.
"fx": Specifies effects applied to the patch.
"lfo": Configures the Low-Frequency Oscillator settings.
"preset_settings": Includes additional settings accessible via the preset settings menu.
"regions": For sample-based patches, defines sample mappings and parameters.
"octave": Adjusts the global octave setting.
"platform": Identifies the device platform (e.g., "OP-XY").
"type": Specifies the type of patch (e.g., "synth", "drum", "oneshot", "multisample").
"version": Indicates the patch format version.
Example of the root structure:

{
  "engine": { /* Engine settings */ },
  "envelope": { /* Envelope settings */ },
  "fx": { /* Effects settings */ },
  "lfo": { /* LFO settings */ },
  "preset_settings": { /* Preset settings */ },
  "regions": [ /* Sample regions */ ],
  "octave": 0,
  "platform": "OP-XY",
  "type": "synth",
  "version": 4
}
3. Common Top-Level Fields
The following sections describe the common top-level fields present in the OP-XY patch JSON files.

3.1 engine

Type: Object
Description: Defines the synth engine or sampler used in the patch and contains engine-specific parameters.
Fields:
"type": String specifying the engine type (e.g., "axis", "dissolve", "epiano", "drum", "multisample").
"params": Array of integers representing engine-specific parameter values.
Additional fields:
"bend_range": Integer specifying the pitch bend range in semitones. Range: 0 to 24.
"highpass": Integer (0 to 32767) controlling the high-pass filter cutoff frequency.
"play_mode": String specifying the play mode (e.g., "poly", "mono").
"portamento": Object containing:
"amount": Integer specifying the portamento time.
"type": String specifying the portamento type (e.g., "linear", "exponential").
"transpose": Integer for transposing the pitch. Range: -24 to +24 semitones.
"tuning": Object containing:
"root": String specifying the root note (e.g., "C", "A#").
"scale": String specifying the tuning scale (e.g., "equal_temperament").
"velocity_sensitivity": Integer (0 to 32767) representing how responsive the patch is to velocity.
"volume": Integer (0 to 32767) for overall patch volume.
"width": Integer representing stereo width. Range: 0 to 32767.
Example:

"engine": {
  "type": "dissolve",
  "params": [8192, 13107, 16384, 19660, 0, 0, 0, 0],
  "bend_range": 12,
  "highpass": 8192,
  "play_mode": "poly",
  "portamento": {
    "amount": 0,
    "type": "linear"
  },
  "transpose": 0,
  "tuning": {
    "root": "C",
    "scale": "equal_temperament"
  },
  "velocity_sensitivity": 16384,
  "volume": 16384,
  "width": 8192
}
3.2 envelope

Type: Object
Description: Contains the envelope settings for amplitude ("amp") and filter ("filter").
Fields:
"amp": Object defining the amplitude envelope with ADSR parameters.
"filter": Object defining the filter envelope with ADSR parameters.
Example:

"envelope": {
  "amp": { "attack": 500, "decay": 1000, "sustain": 0.8, "release": 1500 },
  "filter": { "attack": 300, "decay": 800, "sustain": 0.5, "release": 1200 }
}
Note: Ensure that envelope times ("attack", "decay", "release") are integers in milliseconds (0 to 10,000 ms), and "sustain" values are floats between 0.0 and 1.0.

3.3 fx (Effects)

Type: Object or Array of Objects (if multiple effects are supported)
Description: Specifies the effects applied to the patch.
Fields:
"active": Boolean indicating whether the effect is enabled.
"type": String specifying the effect type.
"params": Array of integers representing effect parameters.
Valid Effect Types:

"ladder"
"svf"
"z_hipass"
"z_lowpass"
Example:

"fx": {
  "active": true,
  "type": "svf",
  "params": [16384, 8192, 0, 0, 0, 32767, 0, 0]
}
Note:

The "params" array contains effect-specific parameters, which are defined in the effect details.
Based on the examples provided, parameters typically include cutoff frequency, resonance, drive, filter mode, and additional effect-specific settings.
3.4 lfo (Low-Frequency Oscillator)

Type: Object
Description: Configures the LFO settings for the patch.
Fields:
"active": Boolean indicating whether the LFO is enabled.
"type": String specifying the LFO type (e.g., "tremolo", "random", "element").
"params": Array containing LFO-specific parameters.
Example:

"lfo": {
  "active": true,
  "type": "tremolo",
  "params": [16384, 8192, 8192, 0, 0, 0, 0, 0]
}
3.5 preset_settings

Type: Object
Description: Includes additional settings accessible via the preset settings menu, such as tuning, velocity sensitivity, and modulation routings.
Fields:
"settings": Object containing general settings.
"velocity_sensitivity": Integer (0 to 32767) representing velocity sensitivity.
"transpose": Integer (-24 to +24) for transposing the pitch.
"highpass": Integer (0 to 32767) controlling high-pass filter settings.
"width": Integer (0 to 32767) representing stereo width.
"portamento": Object containing "amount" and "type".
"tuning": Object containing "root" and "scale".
"mod": Object defining modulation routing settings.
Modulation sources include "modwheel", "aftertouch", "pitchbend", "velocity".
Each source has "amount" (Integer 0 to 32767) and "target" (Parameter ID).
Example:

"preset_settings": {
  "settings": {
    "velocity_sensitivity": 16384,
    "transpose": 0,
    "highpass": 8192,
    "width": 16384,
    "portamento": {
      "amount": 0,
      "type": "linear"
    },
    "tuning": {
      "root": "C",
      "scale": "equal_temperament"
    }
  },
  "mod": {
    "modwheel": { "amount": 8192, "target": 24576 },
    "aftertouch": { "amount": 0, "target": 0 },
    "pitchbend": { "amount": 8192, "target": 0 },
    "velocity": { "amount": 16384, "target": 0 }
  }
}
Note: Modulation settings must be placed under "preset_settings" -> "mod".

4. Engine Section Details
4.1 Overview

The "engine" section defines the synth engine or sampler used in the patch and includes engine-specific parameters that shape the sound. This section is critical as it determines the fundamental characteristics of the patch.

Fields in the "engine" Object:

"type": Specifies the engine type.
"params": An array of parameters specific to the engine.
Additional fields may include:
"bend_range": Integer (0 to 24) specifying the pitch bend range in semitones.
"highpass": Integer (0 to 32767) controlling the high-pass filter cutoff frequency.
"play_mode": String (e.g., "poly", "mono") specifying the play mode.
"portamento": Object containing:
"amount": Integer specifying portamento time.
"type": String specifying portamento type (e.g., "linear", "exponential").
"transpose": Integer (-24 to +24) for transposing the pitch.
"tuning": Object containing:
"root": String specifying root note.
"scale": String specifying tuning scale.
"velocity_sensitivity": Integer (0 to 32767) representing velocity sensitivity.
"volume": Integer (0 to 32767) for overall patch volume.
"width": Integer (0 to 32767) representing stereo width.
Note: All additional fields must be defined in the specification if they are to be used.

4.2 Engine Parameters

The "params" array within the "engine" object contains numerical values corresponding to specific parameters of the selected engine. The number of parameters and their meanings vary depending on the engine type. Parameters are typically represented as integers ranging from 0 to 32767.

General Structure:

"engine": {
  "type": "engine_type",
  "params": [param0, param1, param2, param3, param4, param5, param6, param7],
  /* Additional fields */
}
param0 to param7: Engine-specific parameters, where unused parameters are set to 0.
Ensure parameter values are within specified ranges.
4.3 Synth Engine Details

Provide detailed descriptions for each engine type, including parameter meanings and ranges. For any additional fields like "bend_range" and "highpass", include clear definitions and acceptable ranges.

Example of Additional Fields:

"bend_range":
Type: Integer
Description: Specifies the range of pitch bend in semitones.
Range: 0 (no pitch bend) to 24 (two octaves).
"highpass":
Type: Integer (0 to 32767)
Description: Controls the cutoff frequency of a high-pass filter applied to the engine's output.
Range: 0 (no filtering) to 32767 (maximum filtering).
5. Effects Section Details
5.1 Overview

The "fx" section specifies the effects applied to the patch, enhancing or altering the sound. The OP-XY supports the following effect types:

"ladder"
"svf"
"z_hipass"
"z_lowpass"
Each effect type has its own set of parameters that control its behavior.

5.2 Effect Activation

Field: "active"
Type: Boolean (true or false)
Description: Determines if the effect is applied to the patch.
Example:

"fx": {
  "active": true,
  ...
}
5.3 Effect Types and Parameters

Based on the examples provided and common filter characteristics, the parameters for each effect type are as follows:

5.3.1 Ladder Filter
Type: "ladder"
Description: A classic analog-style low-pass filter known for its warm and smooth sound.
Parameters ("params" array):

Cutoff Frequency
Index: 0
Type: Integer (0 to 32767)
Description: Controls the cutoff frequency of the filter.
Resonance
Index: 1
Type: Integer (0 to 32767)
Description: Controls the resonance at the cutoff frequency.
Drive
Index: 2
Type: Integer (0 to 32767)
Description: Adds harmonic distortion to the signal.
Wet/Dry Mix
Index: 5
Type: Integer (0 to 32767)
Description: Balances the processed (wet) and unprocessed (dry) signals.
Example:

"fx": {
  "active": true,
  "type": "ladder",
  "params": [16384, 8192, 4096, 0, 0, 32767, 0, 0]
}
5.3.2 State Variable Filter (SVF)
Type: "svf"
Description: A versatile filter capable of low-pass, high-pass, band-pass, and notch filtering.
Parameters ("params" array):

Cutoff Frequency
Index: 0
Type: Integer (0 to 32767)
Resonance
Index: 1
Type: Integer (0 to 32767)
Filter Mode
Index: 2
Type: Integer (Enumeration)
0: Low-pass
1: High-pass
2: Band-pass
3: Notch
Drive
Index: 3
Type: Integer (0 to 32767)
Wet/Dry Mix
Index: 5
Type: Integer (0 to 32767)
Example:

"fx": {
  "active": true,
  "type": "svf",
  "params": [22605, 7041, 0, 573, 0, 32767, 0, 8846]
}
5.3.3 Z-Filter (z_hipass and z_lowpass)
Types: "z_hipass", "z_lowpass"
Description: Digital filters providing precise control over the frequency spectrum.
Parameters ("params" array):

Cutoff Frequency
Index: 0
Type: Integer (0 to 32767)
Resonance
Index: 1
Type: Integer (0 to 32767)
Slope
Index: 2
Type: Integer
Description: Controls the steepness of the filter.
Drive
Index: 3
Type: Integer (0 to 32767)
Wet/Dry Mix
Index: 5
Type: Integer (0 to 32767)
Example:

"fx": {
  "active": true,
  "type": "z_lowpass",
  "params": [10403, 3603, 2785, 12779, 0, 32767, 19005, 5242]
}
5.4 Effect Parameter Details

Indexes 4, 6, and 7 in the "params" array may represent additional effect-specific parameters or reserved spaces for future use. They can include:

Index 4: Additional modulation amount or parameter control.
Index 6: Output level or balance between effect stages.
Index 7: Secondary parameter control, such as frequency offset.
Data Types and Ranges:

Cutoff Frequency: Integer (0 to 32767)
Resonance: Integer (0 to 32767)
Drive: Integer (0 to 32767)
Filter Mode: Integer (0 to 3)
Slope: Integer (e.g., 6, 12, 18, 24 dB per octave represented proportionally)
Wet/Dry Mix: Integer (0 to 32767)
Additional Parameters: Integer (0 to 32767)

6. LFO Section Details
6.1 Overview

The "lfo" section defines the Low-Frequency Oscillator settings, which modulate parameters over time to create dynamic changes in the sound. LFOs can affect various parameters, adding movement and expressiveness to the patch.

Fields in the "lfo" Object:

"active": Boolean indicating whether the LFO is enabled.
"type": String specifying the LFO type (e.g., "tremolo", "random", "element", "value").
"params": Array containing LFO-specific parameters.
6.2 LFO Activation

Field: "active"
Type: Boolean (true or false)
Description: Enables or disables the LFO.
Example:

"lfo": {
  "active": true,
  ...
}
6.3 LFO Types

Possible LFO types include:

"tremolo"
"random"
"element"
"value"
Example:

"lfo": {
  "type": "tremolo",
  ...
}
6.4 LFO Parameters

The "params" array contains parameters specific to the LFO type.

Common LFO Parameters:

Speed
Index: 0
Type: Integer (0 to 32767)
Description: Controls the speed of the LFO.
Amount
Index: 1
Type: Integer (0 to 32767)
Description: Determines the depth of modulation.
6.5 Type-Specific Parameters

6.5.1 Tremolo LFO
Purpose: Modulates the volume or pitch to create tremolo or vibrato effects.
Parameters ("params" array):

Speed (Index 0): As above.
Amount (Index 1): As above.
Envelope (Index 2)
Type: Integer (0 to 32767)
Description: Shapes the modulation over time.
Shape (Index 3)
Type: Integer (Enumeration)
Possible Values:
0: "sine"
1: "triangle"
2: "square"
3: "sawtooth"
Mode (Index 4)
Type: Integer (Enumeration)
Possible Values:
0: "tremolo" (volume modulation)
1: "vibrato" (pitch modulation)
Example:

"lfo": {
  "active": true,
  "type": "tremolo",
  "params": [16384, 8192, 8192, 0, 0]
}
6.5.2 Random LFO
Purpose: Generates random modulation signals.
Parameters ("params" array):

Speed (Index 0): As above.
Amount (Index 1): As above.
Smoothness (Index 2)
Type: Integer (0 to 32767)
Description: Controls the smoothness between random values.
Speed Mode (Index 3)
Type: Integer (Enumeration)
Possible Values:
0: "continuous"
1: "tempo_sync"
Example:

"lfo": {
  "active": true,
  "type": "random",
  "params": [17465, 16707, 16051, 1]
}
6.5.3 Element LFO
Purpose: Uses physical inputs like gyroscope or microphone as modulation sources.
Parameters ("params" array):

Source Selection (Index 0)
Type: Integer (Enumeration)
Possible Values:
0: "gyroscope"
1: "microphone"
2: "amp_envelope"
3: "sum"
Amount (Index 1): As above.
Destination Module ID (Index 2)
Type: Integer
Description: Specifies the module to modulate.
Parameter ID (Index 3)
Type: Integer
Description: Specifies the parameter within the module.
Example:

"lfo": {
  "active": true,
  "type": "element",
  "params": [0, 8192, 0, 1]
}
6.6 Enumerations and Valid Values

LFO Types Enumeration:

"tremolo"
"random"
"element"
"value"
LFO Shape Enumeration (for Tremolo LFO):

0: "sine"
1: "triangle"
2: "square"
3: "sawtooth"
LFO Mode Enumeration (for Tremolo LFO):

0: "tremolo"
1: "vibrato"
Speed Mode Enumeration (for Random LFO):

0: "continuous"
1: "tempo_sync"
Source Selection Enumeration (for Element LFO):

0: "gyroscope"
1: "microphone"
2: "amp_envelope"
3: "sum"
7. Modulation Section Details
7.1 Overview

The modulation section defines how various modulation sources affect parameters in the patch, adding expressiveness and dynamics. Modulation routings are specified within the "preset_settings" object under the "mod" key.

7.2 Modulation Structure

Modulation routings are included within the "preset_settings" under the "mod" subsection.

Example:

"preset_settings": {
  "mod": {
    "modwheel": { "amount": 8192, "target": 24576 },
    "aftertouch": { "amount": 0, "target": 0 },
    "pitchbend": { "amount": 8192, "target": 0 },
    "velocity": { "amount": 16384, "target": 0 }
  }
}
7.3 Modulation Sources

Fields: "modwheel", "aftertouch", "pitchbend", "velocity"

Each source is an object containing:

"amount": Integer (0 to 32767) determining the depth of modulation.
"target": Integer (Parameter ID) specifying which parameter the modulation source affects.
7.4 Modulation Targets

Field: "target"
Type: Integer (Parameter ID)
Description: Specifies the parameter to be modulated.
Parameter IDs are unique identifiers for modulate-able parameters within the engine, effects, or other modules.

7.5 Modulation Amount

Field: "amount"
Type: Integer (0 to 32767)
Description: Determines the intensity of the modulation source on the target parameter.
7.6 Correct Placement of Modulation Settings

Modulation settings must be placed under "preset_settings" -> "mod", not within the "engine" object.
Action: Ensure that all modulation routings are correctly nested under "preset_settings".
8. Sampling Section Details
8.1 Overview of Sampling

The "regions" section is critical for sample-based patches, defining how samples are mapped across keys and the parameters for each sample.

8.2 Common Sampling Fields

Each object in the "regions" array represents a sample mapping or zone.

Fields:

"sample": String specifying the sample filename.
"start": Integer (sample frames) for the start point.
"end": Integer (sample frames) for the end point.
"loop_start": Integer (sample frames) for loop start.
"loop_end": Integer (sample frames) for loop end.
"loop_mode": String (Enumeration) defining loop behavior.
"direction": String (Enumeration) for playback direction.
"lokey": Integer (MIDI note number) for the lowest key.
"hikey": Integer (MIDI note number) for the highest key.
"pitch_keycenter": Integer (MIDI note number) for the root pitch.
"tune": Float (in cents) for pitch adjustment.
"gain": Float (in decibels) for volume adjustment.
"pan": Float (-1.0 to 1.0) for stereo positioning.
"play_mode": String (Enumeration) defining how the sample plays.
Additional fields:
"fade_in": Integer (milliseconds) for fade-in duration.
"fade_out": Integer (milliseconds) for fade-out duration.
"mute_group": Integer for grouping samples that mute each other.
8.3 Required Fields

Ensure that each region includes the required fields:

"sample"
"start"
"end"
"lokey"
"hikey"
"pitch_keycenter"
"play_mode"
"loop_mode"
"direction"
"pan"
8.4 Data Types for "gain" and "tune"

"gain": Should be a float (e.g., -3.0 dB).
"tune": Should be a float in cents (e.g., 0.0).
8.5 Loop Modes

Possible Values for "loop_mode":

"no_loop"
"forward"
"backward"
"ping_pong"
8.6 Play Modes

Possible Values for "play_mode":

"key"
"oneshot"
"loop"
"mute_group"
8.7 Sample Direction

Possible Values for "direction":

"forward"
"backward"
8.8 Example of a Sample Region

{
  "sample": "piano_C4.wav",
  "start": 0,
  "end": 441000,
  "loop_start": 22050,
  "loop_end": 418950,
  "loop_mode": "forward",
  "direction": "forward",
  "lokey": 60,
  "hikey": 71,
  "pitch_keycenter": 60,
  "tune": 0.0,
  "gain": -3.0,
  "pan": 0.5,
  "play_mode": "loop",
  "fade_in": 10,
  "fade_out": 10
}
8.9 Data Types and Ranges

Sample Frames: Integer values, depends on sample length.
Tune: Float, typically -100.0 to +100.0 (in cents).
Gain: Float, e.g., -60.0 to +12.0 dB.
Pan: Float, -1.0 (left) to 1.0 (right).
Fade In/Out: Integer, 0 to 10,000 ms.
MIDI Note Numbers: Integer, 0 to 127.
9. Drum and Sample Patch Specifics
9.1 Overview

Drum and sample patches utilize the sampling capabilities to create instruments like drum kits, one-shot samplers, and multisamplers. These patches use the "regions" array to define sample mappings and include specific parameters for sample playback.

9.2 Drum Kit Configuration

The drum sampler maps individual drum sounds to specific MIDI notes. Each drum sound is defined as a region in the "regions" array.

9.2.1 Region Definition for Drums
Fields to include:

Required Fields:
"sample"
"start"
"end"
"lokey"
"hikey"
"pitch_keycenter"
"play_mode"
"loop_mode"
"direction"
"pan"
Optional Fields:
"tune"
"gain"
"mute_group"
9.2.2 Example Drum Kit Configuration
{
  "type": "drum",
  "regions": [
    {
      "sample": "kick.wav",
      "start": 0,
      "end": 44100,
      "lokey": 36,
      "hikey": 36,
      "pitch_keycenter": 36,
      "play_mode": "oneshot",
      "loop_mode": "no_loop",
      "direction": "forward",
      "pan": 0.0,
      "tune": 0.0,
      "gain": 0.0,
      "mute_group": 0
    },
    {
      "sample": "snare.wav",
      "start": 0,
      "end": 44100,
      "lokey": 38,
      "hikey": 38,
      "pitch_keycenter": 38,
      "play_mode": "oneshot",
      "loop_mode": "no_loop",
      "direction": "forward",
      "pan": 0.0,
      "tune": 0.0,
      "gain": 0.0,
      "mute_group": 0
    },
    /* Additional drum sounds */
  ],
  "preset_settings": { /* Optional preset settings */ },
  "platform": "OP-XY",
  "version": 4
}
10. Global Settings
10.1 Octave Adjustment

Field: "octave"
Type: Integer
Range: Typically -2 to +2
Description: Adjusts the global octave transposition for the patch.
10.2 Platform Identification

Field: "platform"
Type: String
Possible Values: "OP-XY", "OP-1", etc.
Description: Identifies the device platform to ensure compatibility.
10.3 Versioning

Field: "version"
Type: Integer
Description: Indicates the format version of the patch file.
11. Data Types and Ranges
11.1 Numerical Values

Integer:

Used for parameters like MIDI note numbers, indices, and integer ranges.
Ranges:
Envelope Times: 0 to 10,000 (milliseconds)
Parameter Values: 0 to 32767
MIDI Note Numbers: 0 to 127
Float:

Used for parameters requiring decimal precision.
Ranges:
Tune: -100.0 to +100.0 (in cents)
Gain: -60.0 to +12.0 (decibels)
Pan: -1.0 (left) to +1.0 (right)
11.2 Enumerations

Enumerations represent parameters with predefined values.

Examples:

Synth Engine Types: "axis", "dissolve", "epiano", etc.
Waveform Shapes: "sine", "square", "sawtooth", etc.
Play Modes: "key", "oneshot", "loop", "mute_group"
Loop Modes: "no_loop", "forward", "backward", "ping_pong"
LFO Types: "tremolo", "random", "element", "value"
11.3 Data Type Consistency

Ensure all parameters use the correct units:
Time: Milliseconds
Gain: Decibels (Float)
Tune: Cents (Float)
Avoid using incorrect data types:
Do not use integers where floats are required, and vice versa.
12. Best Practices
12.1 Field Naming and Structure

Use snake_case for field names.
Do not use dot notation in field names; instead, use nested objects or underscores.
Example Correction:
Replace "portamento.amount" with:
"portamento": {
  "amount": 0,
  "type": "linear"
}
12.2 Field Order

Recommendation: Maintain a consistent field order for readability.
Suggested Order:
"engine"
"envelope"
"fx"
"lfo"
"preset_settings"
"regions"
"octave"
"platform"
"type"
"version"
12.3 Including "preset_settings" Object

Always include the "preset_settings" object for additional settings and modulation routings.
Place parameters like "velocity_sensitivity" and "transpose" within "preset_settings" -> "settings".
12.4 Defining Additional Fields

All fields used must be defined within the technical specification.
Fields like "bend_range" and "highpass" have been added to the "engine" object with clear definitions and acceptable ranges.
12.5 Avoiding Undefined Fields

Do not include fields that are not defined in the specification.
If new fields are necessary, they should be formally added to the specification.
12.6 Data Validation

Ensure all numerical values are within the specified ranges.
Adjust parameter values to be within the acceptable ranges (e.g., envelope times between 0 and 10,000 ms).
12.7 Units Consistency

Use consistent units for all parameters as specified:
Milliseconds for times.
Decibels for gain.
Cents for tuning.
13. Best Practices

13.1 Field Order
Recommendation: While JSON objects are unordered by definition, maintaining a consistent field order improves readability and maintainability.
Suggested Order:
"engine"
"envelope"
"fx"
"lfo"
"preset_settings"
"regions"
"octave"
"platform"
"type"
"version"
13.2 Default Values
Optional Fields: If certain fields are omitted, the device should use default values.
Defaults:
Envelopes: If an envelope is not specified, default ADSR values should be applied.
Effects: If the "fx" section is missing, effects are considered inactive.
Modulation Routings: Unspecified modulation sources default to an amount of 0.
13.3 Error Handling
Missing Data: If required fields are missing, the device should handle the patch gracefully, possibly by rejecting the patch or using default values.
Invalid Data: If values are out of range or of the wrong type, the device should ignore the invalid parameter and possibly notify the user.
Consistency Checks: Ensure that loop points are within the sample's length, and that "hikey" is not less than "lokey".
14. Examples

14.1 Synth Patch Example
A simple lead sound using the "simple" engine:

{
  "engine": {
    "type": "simple",
    "params": [1, 16384, 8192, 24576, 0, 0, 0, 0]
  },
  "envelope": {
    "amp": {
      "attack": 10,
      "decay": 200,
      "sustain": 0.7,
      "release": 500
    }
  },
  "fx": {
    "active": true,
    "type": "delay",
    "params": [300, 16384, 8192]
  },
  "lfo": {
    "active": true,
    "type": "tremolo",
    "params": [16384, 8192, 8192, 0, 0]
  },
  "preset_settings": {
    "settings": {
      "velocity_sensitivity": 16384,
      "portamento_type": "linear",
      "transpose": 0,
      "width": 16384
    }
  },
  "octave": 0,
  "platform": "OP-XY",
  "type": "synth",
  "version": 4
}
14.2 Drum Kit Example
A drum kit with kick, snare, and hi-hats:

(Refer to Section 10.2.2 for the example.)

14.3 Sample-Based Patch Example
A multisample instrument with overlapping zones:

{
  "type": "multisample",
  "regions": [
    {
      "sample": "piano_C3.wav",
      "lokey": 48,
      "hikey": 59,
      "pitch_keycenter": 48,
      "start": 0,
      "end": 441000,
      "loop_start": 22050,
      "loop_end": 418950,
      "loop_mode": "forward",
      "direction": "forward",
      "tune": 0.0,
      "gain": -3.0,
      "pan": -0.5,
      "fade_in": 10,
      "fade_out": 10,
      "play_mode": "loop"
    },
    {
      "sample": "piano_C4.wav",
      "lokey": 60,
      "hikey": 71,
      "pitch_keycenter": 60,
      "start": 0,
      "end": 441000,
      "loop_start": 22050,
      "loop_end": 418950,
      "loop_mode": "forward",
      "direction": "forward",
      "tune": 0.0,
      "gain": -3.0,
      "pan": 0.5,
      "fade_in": 10,
      "fade_out": 10,
      "play_mode": "loop"
    }
    /* Additional sample zones */
  ],
  "preset_settings": { /* Optional preset settings */ },
  "platform": "OP-XY",
  "version": 4
}
14.4 LFO Configuration Examples
14.4.1 Element LFO Example

"lfo": {
  "active": true,
  "type": "element",
  "params": [
    0,      // Source: gyroscope
    8192,   // Amount
    0,      // Destination module ID (e.g., filter)
    1,      // Parameter ID (e.g., cutoff frequency)
    0, 0, 0, 0
  ]
}
14.4.2 Random LFO Example

"lfo": {
  "active": true,
  "type": "random",
  "params": [
    16384,  // Speed
    8192,   // Amount
    8192,   // Envelope
    1,      // Speed Mode: tempo_sync
    0, 0, 0, 0
  ]
}
14.4.3 Tremolo LFO Example

"lfo": {
  "active": true,
  "type": "tremolo",
  "params": [
    12288,  // Speed
    16384,  // Amount
    8192,   // Envelope
    0,      // Shape: sine
    0,      // Mode: tremolo (volume modulation)
    0, 0, 0
  ]
}
14.4.4 Value LFO Example

"lfo": {
  "active": true,
  "type": "value",
  "params": [
    20480,  // Speed
    8192,   // Amount
    0,      // Destination module ID
    1,      // Parameter ID
    0,      // Trigger Mode: continuous
    0, 0, 0
  ]
}

Amendment to the Technical Specification Based on Ground Truth Examples

Introduction

This amendment updates and clarifies the OP-XY Patch JSON File Format specification to align with the ground truth examples provided. The examples represent the actual implementation and take precedence over the previous specifications. Any discrepancies are resolved herein, with the ground truth overriding prior guidelines.

1. Field Naming Conventions

1.1 Support for Dot Notation in Field Names
Contrary to the original specification, dot notation is supported in field names. Fields can use dots to represent nested properties without requiring additional nesting.

Examples:

"portamento.amount": 0 instead of nesting under "portamento": { "amount": 0 }.
"tuning.root": 0 instead of nesting under "tuning": { "root": "C" }.
"velocity.sensitivity": 24576 instead of "velocity_sensitivity": 24576.
1.2 Field Names Not Restricted to Snake Case
Field names do not need to strictly follow the snake_case convention. CamelCase or concatenated words are acceptable.

Examples:

"bendrange" instead of "bend_range".
"playmode" instead of "play_mode".
2. Modulation Settings Placement

2.1 Modulation Under "engine"
Modulation settings are placed under the "engine" object using the "modulation" key, rather than under "preset_settings".

Structure:

"engine": {
  "modulation": {
    "aftertouch": { "amount": 16384, "target": 0 },
    "modwheel": { "amount": 16384, "target": 0 },
    "pitchbend": { "amount": 16384, "target": 0 },
    "velocity": { "amount": 16384, "target": 0 }
  },
  ...
}
2.2 Modulation Sources and Targets
Modulation sources include "aftertouch", "modwheel", "pitchbend", and "velocity". Each source has:

"amount": Integer (0 to 32767).
"target": Integer representing the parameter ID.
3. Additional Fields Definition

3.1 "framecount"
Type: Integer.
Description: Total number of frames in the sample.
Usage: Provides the length of the sample in audio frames.
3.2 "reverse"
Type: Boolean.
Description: Indicates if the sample should be played in reverse.
Usage: "reverse": true or "reverse": false.
3.3 "sample.end" and "sample.start"
Type: Integer.
Description: Specifies the start and end points of the sample in frames.
Usage: Used alongside "start" and "end" for clarity.
3.4 "loop.onrelease"
Type: Boolean.
Description: Determines if the loop should continue after the key is released.
Usage: "loop.onrelease": true or "loop.onrelease": false.
3.5 "loop.crossfade"
Type: Integer.
Description: Length of the crossfade at the loop point in frames.
Usage: Smoothens the transition at the loop point.
4. Data Types Adjustments

4.1 "tuning.root" and "tuning.scale"
Type: Integer.
Description: Represents the root note and scale using numeric codes.
Mapping for "tuning.root":
0: "C"
1: "C#"
2: "D"
3: "D#"
4: "E"
5: "F"
6: "F#"
7: "G"
8: "G#"
9: "A"
10: "A#"
11: "B"
"tuning.scale": Similar numeric mapping for scales.
4.2 "portamento.type"
Type: Integer.
Description: Represents the portamento type.
Mapping:
0: "linear"
1: "exponential"
5. Enumerations and Value Mappings

5.1 "fx.type" Enumeration
Values:
"svf": State Variable Filter.
"z lowpass": Z-Plane Low-Pass Filter.
Other types as per examples.
5.2 "playmode" Values
Values:
"poly": Polyphonic play mode.
"mono": Monophonic play mode.
6. Sample Region Fields Using Dot Notation

Fields within the "regions" array can use dot notation to represent nested properties.

Examples:

"loop.crossfade": 42339
"loop.end": 118499
"loop.start": 25379
"pitch.keycenter": 72
"sample.end": 264596
7. Field Values and Ranges

7.1 "bendrange"
Type: Integer.
Description: Specifies the pitch bend range.
Range: Accepts values beyond the previously specified 0 to 24.
7.2 "gain"
Type: Integer.
Description: Gain value, possibly representing decibels.
Usage: Directly used as provided in examples (e.g., "gain": 4).
7.3 "volume"
Type: Integer.
Description: Overall volume of the patch.
Range: As per examples (e.g., "volume": 26211).
8. Modulation Settings Structure

Modulation settings are defined within the "engine" object under the "modulation" key. This structure includes modulation sources and their corresponding amounts and targets.

Example:

"engine": {
  "modulation": {
    "aftertouch": { "amount": 16384, "target": 0 },
    "modwheel": { "amount": 16384, "target": 0 },
    "pitchbend": { "amount": 16384, "target": 0 },
    "velocity": { "amount": 16384, "target": 0 }
  },
  ...
}
9. Effects Parameters

9.1 "fx.params" Structure
The "params" array within the "fx" object follows the structure used in the examples, accepting values directly as integers.

Example:

"fx": {
  "active": true,
  "params": [22605, 7041, 0, 573, 0, 32767, 0, 8846],
  "type": "svf"
}
9.2 "fx.type" Values
The "type" field accepts values as seen in the examples, including variations like "svf" and "z lowpass".
10. LFO Parameters

10.1 "lfo.params" Structure
The "params" array within the "lfo" object uses integer values as provided in the examples.

Example:

"lfo": {
  "active": true,
  "params": [17796, 18676, 13428, 23920, 0, 0, 0, 16384],
  "type": "tremolo"
}
10.2 "lfo.type" Values
The "type" field accepts values such as "tremolo".
11. Regions Array Adjustments

11.1 Inclusion of Additional Fields
The "regions" array may include fields not previously specified, such as:

"framecount"
"gain"
"loop.crossfade"
"loop.onrelease"
"reverse"
"sample.end"
"sample.start"
"tune"
11.2 Field Definitions
"gain": Integer representing the gain adjustment for the sample.
"tune": Integer for tuning adjustments, possibly in cents.
"sample.start" and "sample.end": Define the start and end frames of the sample.
12. General Acceptance of Examples

12.1 Examples Override Prior Specification
The provided ground truth examples are authoritative. Any contradictions between the initial specification and these examples are resolved in favor of the examples.

12.2 Flexibility in JSON Structure
Parsers and implementations should accommodate the structure and field usage as demonstrated in the examples, even if they differ from the original specification.

13. Conclusion

This amendment ensures that the OP-XY Patch JSON File Format specification accurately reflects the actual implementation. Developers and users should use this amended specification when creating, editing, or parsing patch files for the OP-XY device.

Updated Examples

Below are the examples from the ground truth, formatted for clarity and based on the amended specification.

Example 1
{
  "engine": {
    "bendrange": 23919,
    "highpass": 0,
    "modulation": {
      "aftertouch": { "amount": 16384, "target": 0 },
      "modwheel": { "amount": 16384, "target": 0 },
      "pitchbend": { "amount": 16384, "target": 0 },
      "velocity": { "amount": 16384, "target": 0 }
    },
    "params": [16384, 16384, 16384, 16384, 16384, 16384, 16384, 16384],
    "playmode": "poly",
    "portamento.amount": 0,
    "portamento.type": 0,
    "transpose": 0,
    "tuning.root": 0,
    "tuning.scale": 0,
    "velocity.sensitivity": 24576,
    "volume": 26211,
    "width": 0
  },
  "envelope": {
    "amp": { "attack": 17038, "decay": 32767, "release": 22249, "sustain": 15561 },
    "filter": { "attack": 6716, "decay": 32767, "release": 18022, "sustain": 13104 }
  },
  "fx": {
    "active": true,
    "params": [22605, 7041, 0, 573, 0, 32767, 0, 8846],
    "type": "svf"
  },
  "lfo": {
    "active": true,
    "params": [17796, 18676, 13428, 23920, 0, 0, 0, 16384],
    "type": "tremolo"
  },
  "octave": 0,
  "platform": "OP-XY",
  "regions": [
    {
      "framecount": 264596,
      "gain": 4,
      "hikey": 60,
      "lokey": 0,
      "loop.crossfade": 42339,
      "loop.end": 118499,
      "loop.onrelease": true,
      "loop.start": 25379,
      "pitch.keycenter": 72,
      "reverse": false,
      "sample": "tape.aif",
      "sample.end": 264596,
      "tune": 0
    }
  ],
  "type": "sampler",
  "version": 4
}
The remaining examples follow the same structure and conventions as demonstrated above.

Guidance for Developers

Developers working with OP-XY patch files should:

Adhere to the amended specification, using the ground truth examples as a primary reference.
Support dot notation in field names where applicable.
Allow flexibility in field naming conventions, not strictly enforcing snake_case.
Implement parsers that can handle the structures and data types used in the examples.
Map integer codes to their corresponding string values for fields like "tuning.root" and "portamento.type".

Here are some practical tips on sound design:

Dissolve Synth Engine Practical Guide

This guide focuses on crafting patches for the Dissolve synth engine using the OP-XY's preset JSON syntax, connecting technical aspects to sound design principles for real-world applications.

Understanding the "engine" Object

The settings of the Dissolve synth engine are defined in the "engine" object in the JSON file.

"type": "dissolve" specifies that the Dissolve synth engine is being used.

"params" is an array of eight integers representing parameters that control the sound of the Dissolve synth.

Dissolve Synth Parameters ("params" Array)

Swarm (Index 0)

Introduces noise modulation to the oscillator.

Range: 0 (pure sine wave) to higher values (increasing noise).

Sound Design Tip: Increase swarm to add texture, like creating a respace patch.

Amplitude Modulation - AM (Index 1)

Shapes the oscillator's waveform towards square, sawtooth, or a combination.

Sound Design Tip: Increase AM to add harmonics and richness.

Frequency Modulation - FM (Index 2)

Adds frequency modulation for a sawtooth-like character.

Sound Design Tip: Crank FM to generate a distinctive sawtooth edge.

Detune (Index 3)

Detunes the oscillator, widening the sound in stereo.

Sound Design Tip: Higher detune adds a large, expansive quality.

Additional "engine" Object Fields

Highpass

Controls the cutoff frequency of a high-pass filter.

Sound Design Tip: Use highpass to remove unwanted low-end.

Playmode

"poly" or "mono" to control note behavior.

Sound Design Tip: Mono playmode suits basslines or leads; poly works well for chord patches.

Portamento

Controls note glide between pitches.

Sound Design Tip: Adding portamento to leads can smooth transitions and add expressiveness.

Envelopes, Filters, and LFOs

The "envelope", "fx", and "lfo" objects further shape your sound.

Use these features to add dynamics, modulation, and unique characteristics to your patches.

Key Points

Master the core parameters (swarm, AM, FM, detune) to shape the fundamental sound.

Combine parameters with filters and LFOs to achieve dynamic and evolving patches.

Experimentation is crucial—each setting can produce dramatically different outcomes.

OP-XY LFO JSON Field Guide

This section provides practical insights into using the LFO parameters within the OP-XY JSON format.

Activating and Choosing LFO Type

Activate LFO: "lfo": { "active": true } enables the LFO. Set to false to disable.

LFO Types:

"tremolo": Rhythmic volume or pitch variations.

"random": Introduces unpredictability to modulation.

"element": Uses physical inputs (e.g., motion sensor) for modulation.

"value": Applies basic waveforms (e.g., sine, square) to modulate parameters.

Common LFO Parameters ("params" Array)

Speed (Index 0): Controls how fast the LFO modulates the parameter.

Amount (Index 1): Adjusts the intensity of modulation.

Type-Specific Examples

Tremolo LFO: Modulates volume or pitch. Adjust shape for different waveforms (e.g., sine, square).

Random LFO: Control smoothness for sharper or softer changes. Use tempo-sync for rhythmic modulation.

Element LFO: Choose real-world sources like a gyroscope to modulate parameters in unique ways.

String Synth Practical Tips

Emulating String Tension

Decay and Brightness Control: Longer decay with looser tension creates brighter, sustained sounds.

Implementation: Adjust the "envelope" object for filter decay and release to emulate tension.

Plucked vs. Bowed Sounds

Impulse Decay: Use shorter values for plucked, and longer for bowed-like sustained strings.

Detune and Stereo Width

Detune: Add slight detune for stereo width and a more lively sound.

Width: Use "engine": { "width": ... } to adjust stereo spread.

Subjective Sound Design Considerations

Experiment with tension and detune to find your ideal sound.

Tailor settings to the role of the sound—percussive vs. melodic.

Sound Design Tips from Tutorials

Here are some sound-shaping techniques:

Subtle Modulation: Use lower LFO depth for movement without overwhelming the sound.

Negative Modulation: Modulate a parameter inversely to create texture.

Soft vs. Hard Attack: Adjust impulse or envelope settings to achieve softer or harsher attacks.

Plucked vs. Sustained Strings: Play with impulse decay for plucked vs. bowed sounds.

These tips help illustrate the relationship between abstract settings in JSON and their real-world impact on sound design. They bridge the technical and creative aspects of patch creation, providing you with a hands-on approach to experimenting with the OP-XY synthesizer.

Now based on all this, please create a pluck patch. It should sound a bit like the plush in Kygo's Firestone. Almost like a steel drum a little bit. It should sound very tropical house. Give it to me as JSON for a preset.