# Amplifier for a 144 MHz (to listen to the ISS)
I recently learned that you can actually relatively easily pick up the International Space Station on commercially available radios, so I decided to try this out.
Just to have a little more fun, I'm going to build a single state LNA to boost the signal up a little bit, which might be necessary given thehigh nosie figure of the RTLSDR I'm using.

## Theory and design
I'm going to power the LNA using the bias tee feature of my RTL-SDR, so it'll receive 5 volts from the output connector.
In order to separate out the power from the output signal, I'm using a capacitor and inductor to separate the high frequency signal componet from the low frequency DC component.
This, plus plenty of bypass capacitors, should allow me to power the LNA through the output signal line.

![Schematic for the design](./schematic.jpg)

I'm using the NXP BFU520R transistor as the heart of this amplifier.
It's being used in a pretty standard/simple common emitter configuration.
There's a bypassed emitter degenerating resistor, which helps keep the bias point stable against temperature changes.
This has good gain (21 dB at 900 MHz) and low noise figure (~0.6 dB) at the decently low bias current of 5 mA.
Unfortunately, this transistor isn't characterized at 144 MHz, the frequency I'm targetting to receive from, so the SPICE models and the S parameters NXP provides aren't usable.

So I basically just left a lot of spots open in the schematic to add in components if needed, and also added a pair 
of U.FL connectors right next to the transistor to hopefully get accurate measurements.
There's enough spaces for an antenna matching network and source/load matching for the transistor.
These are all 0402, so that I could (kind of) easily swap out components to adjust the circuit on the fly.
I also have to buy some expensive component books so I'd have a good selection of 0402 parts to pick from.
The circuit itself is terminated with a pair of SMA connectors to easily interface with other RF equipment.

I also included a pair of U.FL connectors with two 0402 resistors so it'd be possible to calibrate the VNA to get the calibration plane to match the conditions at the U.FL connectors interfacing with the BFU520.
I'd need to use three different copies of this connector pair to calibrate the VNA, to match the four conditions used for calibrating reflection and transmission:
 - Short (reflection)
 - Open (reflection/transmission)
 - 50 ohms (reflection)
 - Pass through (transmission)

## PCB

![PCB for the second revision](./pcb3d.jpg)

After wasting one revision by accidentally flipping the collector and base pins, I ended up with this layout.
It's pretty self explanatory, nothing too special aside from the normal constraints with RF layout.
I did make my own taper for the SMA connection footprints, using Kicad 5's new custom footprint shape feature, but I haven't actually tested it to see if they work correctly.
I think they look pretty nice though.

## Measurements
