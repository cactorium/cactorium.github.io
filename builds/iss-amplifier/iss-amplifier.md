# Amplifier for a 144 MHz (to listen to the ISS)
I recently learned that you can actually relatively easily pick up the International Space Station on commercially available radios, so I decided to try this out.
Just to have a little more fun, I'm going to build a single state LNA to boost the signal up a little bit, which might be necessary given thehigh nosie figure of the RTLSDR I'm using.

## Theory and design
I'm going to power the LNA using the bias tee feature of my RTL-SDR, so it'll receive 5 volts from the output connector.
In order to separate out the power from the output signal, I'm using a capacitor and inductor to separate the high frequency signal componet from the low frequency DC component.
This, plus plenty of bypass capacitors, should allow me to power the LNA through the output signal line.

![Schematic for the design](./schematic.png)

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

![PCB for the second revision](./pcb3d.png)

After wasting one revision by accidentally flipping the collector and base pins, I ended up with this layout.
It's pretty self explanatory, nothing too special aside from the normal constraints with RF layout.
I did make my own taper for the SMA connection footprints, using Kicad 5's new custom footprint shape feature, but I haven't actually tested it to see if they work correctly.
I think they look pretty nice though.

## Measurements
My intial tests showed the amplifier producing a paltry 10 dB of gain, way less than the expected 20 dB.
It took me a day of testing to realize that this was because of the VNA instead of my circuit design.
The VNA's output is around -6 dBm, while the amplfier (according to the datasheet) has a 1 dB compression point at around +1 dBm.
This meant that the VNA input was definitely saturated the amplifier, limiting the amount of power that could be output, andconsequently degrading the gain measured by the VNA.
The obvious solution to this is to reduce the VNA output, which my cheap VNA obviously doesn't allow.

This meant I needed to add an attenuator between the VNA output and the base of the transistor I'm testing.
This attenuator would affect the measured scattering parameters, so I looked out how to de embed that from the measurement, and 
it turns out it's not too terrible if you transform the values into transmission space first.
However, after adding the attenuator to the circuit, the de embedded measurements didn't seem correct.
They did indicate the 20 dB gain I was expecting, but they also indicated that the transistor was unstable due to |S11| > 1 for a lot of frequncies.
Calibrating the VNA with the attenuator didn't work either.
Now I'm hoping either a simpler attenuator setup, or a better VNA, would give me better results.

![VNA with first attenuator setup](./vnawithuflterminator.jpg)

I ended up disassembling the VNA to see if I could attenuate the signal somewhere internally.
Reducing the signal there is much better than attenuating outside the VNA,
because when you attenuate the signal before the reflection is measured, you reduce the reflection only by the amount you attenuate the signal,
whereas attenuating externally attenuates the signal as it's coming in along with when it's reflected.

For example, if I stuck a 10 dB attenuator internally before the directional coupler,
the output tone would be attenuated by 10 dB, and the reflected signal would be 10 dB weaker because the device under test (DUT) would see a signal 10 dB weaker than the old reference signal.
However, if I used a 10 dB external attenuator, this would attenuate the VNA's output signal by 10 dB, sending a signal 10 dB weaker to the DUT,
and which would reflect a 10 dB weaker back to the attenuator, which would then attenuate that reflection to 10 dB before transmitting it back to the VNA, giving a total of -20 dB attenuation on the reflection.
This meant that my previous setup was attenuating reflections by ~40 dB, which would explain why the measurements looked barely separable for noise

I found some schematics for the VNA and found an attenuator in the Tx signal path.
It was a nice 0805 chip attenuator, so I bought a -10 dB attenuator of the same size and swapped it out.
I took some measurements on the existing attenuator to try to figure out that value it was.
It definitely was less than -10 dB, so replacing it should reduce the signal strength by some useful amount.

![VNA internals](./vnapcb.jpg)

![Replacing a 20 cent part on a $300 board](./vna_rework.jpg)

This seems to have done the trick.
Adding a 10 dB attenuator after the VNA output gives reasonable looking measurements.
The measurements still seem fairly accurate without the 10 dB attenuator, aside from S21 which is obviously compressing.

![Smith chart for the unmatched BFU520 circuit](./smith_unmatched.png)

Doing a conjugate match with these parameters leads to a matching network of 100 nH in series and then shunted with a 2.65 pF capacitor on the soruce,
and a 4.8 pF capacitor shunt followed by a series 60 nH inductor.
This didn't quite work when assembled so I adjusted the source inductor and capacitor to 120 nH and 3.0 pF to get it to match better.
The calculations used here are detailed in the Python notebook in the git repo for the project

![Final measurement setup with matching components in place](./matching_measurement.jpg)

Here are the final measurements:

![Final Smith chart measurements](./smith_matched.png)
![S11, S22 db plot](./db_matched_s11_s22.png)
![S21 db plot](./db_matched_s21.png)

They correlate nicely with the predicted results, and give about 20 dB gain in the range I care about.
I still need to figure out how to do NF measurements to figure out what kind of NF I'm looking at, but that should be relatively easy.
