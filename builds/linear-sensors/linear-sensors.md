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

# Notes on other linear sensors
I've looked at two other major classes of linear position sensing devices,
- Inductive position sensors
- Magnetic position sensors

## Inductive position sensors
These work very similarly to the capacitive sensor looked at above, except their main selling point is their greater tolerance to dirt and oil.
This comes from how they rely on magnetic coupling, instead of electric field coupling, which means they're not affected by the large differences in dielectric constant oil and other contaminants may have.
Ferrites and similar materials, and conductive materials can still affect them.

The most common topology seems to be a transmitting coil that surrounds the receiving coils.
This means the default state is the transmitting field coupling with the entirety of the receiving coils.
The receiving coils are generally designed as sinusoidal waves, so that each half period is in the opposite winding direction than the last one.
This means in the default state, each half period cancels out the other ones.

The scale in this case is a pattern of large conductive areas.
The eddy currents induces by the transmitting coil effectively cancel out some of the transmitting coil's field in the proximity of the conductive areas, thus where there is overlap the magnetic field the receiving coils receive is reduced.
This reduced field means cancellation doesn't happen any more, and the amount of signal that gets through now depends on the position of the conductive pattern.

There are actually a decent number of inductive position sensing ICs, which make implementation much simpler (but less configurable I guess) than with the capacitive system above.
These seem to be meant for tracking motor angular position in control loops, with very high sampling rates, but they should work fine in a linear configuration, and Renesas has some documentation on the linear configuration in their documentation.
There seems to be two major approaches, one where the coils are expected to have sin/cosine amplitudes with respect to position, and one where they expect three coils, still with sinusodial output but with three phases, 120 degrees apart, and internal processing converts that into the sin/cosine phases that you can read using ADCs like usual.
The use of 3 phases is apparently to reduce the inherent nonlinearity in the output; it results in better harmonic cancellation according to Melexis' documents.
In the first category, Renesas have IPS2200 and IPS2550, which seem to be in stock in Digikey, and Microchip has its own line like the LX34050QPW, although they're less well documented than Renesas'.
These seem to be intentionally pin compatible with each other, which I thought was pretty interesting.
Melexis's MLX90510 is in the second category.
Onsemi has this really, high end version in their NCS32100, which uses an 8 phase setup that you need to register an account with them to read about, with 18 ENOBs of accuracy, way above the 10-12bit analog sin-cos outputs most of the other solutions have.

There seem to be other designs that use coils in the scale to act more similarly to the capactive system above, but I like the ease of manufacturability of these Eddy current-based scales, so I'm going to stick with them for now

### Ideas for coil geometries to try
Things to try to do/of note:
- Reduce effects of magnetic field nonlinearity through symmetry and averaging. There's probably some interesting tradeoffs between stronger signal by getting closer to the transmit loop at the cost of experiencing more end effect issues
- Any design will require using more than one PCB layer, because the loops are inherently overlapping, especially when you start adding in phases
- Thinnest traces possible should be better; the coil windings will "look" more like an ideal line the thinner it is. If the traces are wider, different parts within the same width could experience different electric fields, and maybe Eddy currents could be an issue if the traces were thick enough
- There's a vernier effect with the periodicity of the scale versus the receiving coil. This can be twiddled with to get some improved resolution while still making it easy to manufacture.

I will be using 4-layer boards, since they're still relatively cheap, so that gives two layers right next to each other.
I'm going to leave the transmission coil design as a large rectangle of the same size across all the test geometries, using two spirals on the two layers.

Assuming the basic quadrature, sine/cosine setup, the base case is more or less following Renesas's drawing in their datasheets.

One change would be to halve the width of the pattern to fit two of them, potentially reducing the effect of nonuniformity of the magnetic field in the width axis.

You could go even further, and overlap the coil patterns to fit many more in the same space, this would also add in more averaging to deal with manufacturing defects.

If I'm going for a 1mm periodic system, it'd be possible to use 1mm spacing on the scale but use 3mm spacing for the receiving coil periodicity, so that it isn't as bunched up.
5mm or higher is also possible, or even a weird combination like 4mm and 3mm.

Maybe it'd make sense to avoid using the space near the transmitting coils to avoid all that nonuniformity.

In the default pattern, there's the cosine pattern ends with a long trace while the sine one ends at a point.
It's possible to stagger the start and end of the cosine pattern slightly, at the cost of making it no longer symmetric with respect to the transmitting coil.

The effect of the vias on the signal are unknown, but it could have an effect on the signal uniformity because of how it interrupts the traces.
They could be intentionally offset slightly to avoid interrupting the traces.

It'll be interesting to draw all of these ideas out and see how it plays out.

## Magnetic encoders
I noticed Adafruit had this [interesting looking magnetic tape](https://www.adafruit.com/product/4680), where it's magnetized so that there are alternating poles every 5mm.
It turns out these are used analogously to the optical scales in optical encoder systems.
TE's KMXP5000 (AMR Position sensors) and similar are used to produce analog quadrature output from these kinds of tapes.
They use magnetoresistance and probably a lot of careful geometry to form two bridge circuits that translates the magnetic flux from the alternative field pattern into the sin/cosine signals.
The chips also just look really cool; they're designed so you can place them right at the board edge, so it looks like they just chopped a normal QFN package into smaller parts.
These would probably best be used on aluminum or other nonferrous platforms since their accuracy is directly based on sensing the magnetic field

TODO add cool visualizations in here
