# Capactive linear displacement sensing
This project is basically copying the capacitive sensing used in digital calipers to provide low cost precision distance sensing, like that needed in the axes of 3D printers and CNCs.
This is the first step in a rather long term project.
The project files are at this [GitHub repo](https://github.com/cactorium/linear-sensors).

My goal is to eventually integrate and test this inside a 3D printing, CNC, or similar platform (probably some kind of laser etching system).
Current systems tend to either be open loop and rely on a precision made lead screw with stepper motors to ensure good accuracy, or at the high end (think full scale CNC) use an optical scale that's both fragile and also pretty expensive.
I want to see if I can create a axis of similar accuracy that's scalable to any length at a much lower cost by using a closed loop system that will be based on tiling the sensor I'm talking about here.

The current cost is around $20 per board (including components), but I'm hoping to get that down to $10 to be more competitive.
As of **revision 2** the sensor seems fairly precise, with the value varying under +-0.003mm in good circumstances, but I still need to determine its accuracy.

## Theory
So the system works by transmitting 8 versions of a square wave into a set of transmitting electrodes, each phase shifted by a different amount.
The square wave is currently at 1kHz, which provides a decent compromise in achieving good capacitive coupling while also being not too difficult to capture using the MCU's built in ADC.
(Ideally we'd be sending 8 different sine waves, but it's easy enough to filter out the extra harmonics so we're using square waves because they're much easier to generate).
These are capacitively transmitted into a set of electrodes that run the length of the sensor.
These signals are picked up by the electrodes on the scale, so each electrode on the scale that's under the sensor will pick up some combination of these signals.
These scale electrodes then capacitively transmit their signals into the receiving electrode on the sensor, which is then filtered and analyzed to calculate the phase.
It turns out the phase of this combination is *almost* linear with respect to how far the sensor's been offset.

TODO flesh out this section to explain the theory a bit more

There's a lot of filtering before phase calculation because the electrode is picks up a lot of noise and contains a lot of harmonics.
There's some stages of analog filtering that I'll explain in more detail under each different revision, but the main goal's always the same; provide some amount of linear gain while bandpassing to remove mains noise at low frequencies and the square waves' haromonics at higher frequencies, leaving a phase shifted sine wave to analyze for phase.
The analysis is done by both digital and analog means, because the microcontroller I'm using has limited processing power.

The phase analysis is done using the [CORDIC algorithm](https://en.wikipedia.org/wiki/CORDIC), which has the benefit of not requiring any multiplication or division.
The sampled and filtered sine wave is multiplied against a sine wave at 1kHz and a cosine wave at 1 kHz to form I (in-phase) and Q (quadrature) components.
1 kHz was chosen as a compromise between having a high enough frequency to easily filter out low frequency noise, while also still being able to sample it fast enough to accurately determine its phase.
These components are summed over a set number of cycles to allow averaging to remove some noise, and then the CORDIC algorithm is performed over the I and Q components to find the phase angle.

## Hardware
There's only one microcontroller on the board, a STM32F070C6T6 ARM Cortex M0 microcontroller.
This, along with the TLV906X low noise rail-to-rail op amp form the core of the system.
There's a MOSFET for reverse voltage protection, an LDO voltage regulator to get 3.3 V, but not too much else interesting in terms of components.
The PCB design is actually much important in terms of getting this working, the key part of this project was designing the receiving and transmitting electrodes and the corresponding scale.

The most important design element as in the transmitting electrodes.
We can't place the electrodes right next to each other because that'd be impossible to manufacture.
I chose to stagger the electrodes in a zig zag pattern so that there's no vertical gap between one electrode and the next one, and instead there's a small horizontal gap to ensure that the components have enough clearance to be manufacturable. ** TODO add an image here **

The scales are a standard T shape, and the receiving electrode's just a big rectangle that should just cover all the appropriate T-shaped scales.
*Note to self: shrink the receiving electrode so that it doesn't cover the outer scales; this might be what's causing the signal to change shape*

To make the design easier, all of these components were generated using Python scripts.
KiCAD using ASCII-based file formats for all of its files, so this wasn't too difficult.
There's one file, `padgen/pad_config.py`, that contains all the appropriate parameters, and it's used in all the other generation scripts to keep everything in sync.

## Build log 1
The first revision included a few stages of filtering along with a trimmable gain stage followed by a low pass and a fixed gain stage.
The input is biased up to around the middle of the op amp's dynamic range, and that resistor actually forms a high pass filter with the capacitive output of the receiving electrode.
The resistor value had to be tweaked a fair bit to get decent performance.
Also, the filtering in this setup wasn't particularly effective, and the output into the ADC didn't look particularly much like a sine wave; the digital filtering does a great job of cleaning it up I guess.

## Build log 2
*TODO talk about rev 2*
I was hoping to shrink the board during this revision, but it actually ended up noticeably bigger because of the additional analog filtering stages.
The second revision greatly extended the filtering done, using a pair of op amps to add an active bandpass filter.
It still seems to be affected by noise when you touch the scales, but the signal into the ADC looks much closer to a sine wave, so it might be possible to toss out some of the filtering it's doing right now to add in some to filter out this low frequency noise.
I'm honestly probably not going to do anything aside from maybe messing with the frontend filtering since this is working very close to perfectly, as long as you don't touch it.
