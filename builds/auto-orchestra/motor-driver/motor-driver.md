# Motor driver
For this project I decided it'd be fun to make my own motor driver.
I wanted this to be fairly reusable so I could reuse the extra boards in other projects.
To make it as modular as possible, it'll be too separate boards, one that just has the MOSFETs and gate drivers, and one with the motor controller logic/control loops.
In this project all of the motors are stepper motors, so the logic won't be too complicated.

TODO flow chart here I guess

## MOSFET board
This board isn't much more than a bunch of gate drivers hooked up to a bunch of MOSFETs.
I messed around with using bootstrapping gate drivers here.
These gate drivers let you use N-channel MOSFETs for both the high-side and low-side transistors, which can potentially improve performance slightly since N-channels tend to perform a little better than P-channels for a given size/price range.
Normally this wouldn't be possible because you need to drive the gate of the high-side transistor to above the drain voltage, which should already be at the power supply voltage level, so you need to drive the gate above the power supply voltage.
The gate driver manages to do this by using the AC nature of the motor driver output to charge a capacitor and create a voltage level above the power supply.
The tradeoff is that this incurs some limitations on duty cycle and frequency, plus some extra design work to make sure the capacitor stays charged.

To make the design as universal as possible, each board has 8 H bridges, with 4 outputs on each side, and one main power supply and a bunch of power supply caps for all of them.
Four on each side, plus ground connections on the bottom means each side can be used for 2 DC brushed motors, 4 unidirectional DC brushed motors, 1 brushless motor, or 1 bipolar/unipolar stepper motor, so basically every common motor class.
The gate drivers unfortunately have a minimum voltage of 9 V, setting that as the lower limit of operation, but that seems fine for now

## Revision 1
The first board ended up really, really big because I wasn't sure how much space I'd need to heat dissipation.
Nothing too interesting, I did end up writing a script to automatically tile the design.
Since the circuit's basically one H-bridge driver repeated 8 times, I layed out one instance of the design and then did a lot of bugger Python hackery to copy that design over 7 more times, and then did the relatively easy task of shuffling them around to get them to fit relatively well and connecting the remaining lines.

TODO picture of board here
TODO schematic here

I ended up frying a decent number of MOSFETs testing the first revision because the dead time was too short.
The gate driver controls the timing between turning off one of the H bridge transistors and turning on the other one, so that hopefully there's enough time for one to turn off before the other one turns on, and current doesn't conduct through both of them at once, potentially destroying the MOSFETs and also potentially damaging the power supply.
Anyways, they make it configurable using the resistance applied to one of the pins, and adjusting that up fixed the problem.
I also managed to somehow mess up the Arduino-ish board I was using to generate the test signals; it still runs most of the time, but it also heats up a lot more than it used to.
I'm guessing some of the protection diodes somewhere must've shorted out or something.
There was a lot of overshoot on the motor output, and that was fixed by installing the bypass capacitors that I forgot about

So all this paved the way to the next revision; a smaller board with easier access to the PWM pins and fewer capacitors.

## Revision 2

TODO layout here

Here I also fried a bunch of MOSFETs from shorting the driver outputs.
I guess maybe some kind of overcurrent protection might make sense...
