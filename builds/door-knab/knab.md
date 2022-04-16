I made a new door lock that you unlock by knocking in the combination.
This is obviously unreliable, impractical, and insecure, but that hasn't stopped me before.
Also it involves a lot of cool math and I'm in quarantine right now.

# Overall idea
So the plan is to install three piezoelectric sensors on the door, and use the ADC on the microcontroller to listen for knocks.
The sound of the knocks will be delayed differently to each sensor, since they're all located at different distances from where the knock's happening.
The delays will be used to pinpoint the location of the knock, and that'll determine what number they're trying to enter into the lock.
After all the digits are entered within some arbitrary timeout limit, it'll activate a servo or stepper motor to unlock the door.

# Active piezoelectric sensors
I had a bunch of these piezoelectric sensors laying around, which make very nice contact microphones, perfect for this project.
The only downside with using these as sensors is that they're very high impedance, so the long wires from the sensors to the development board act as great antennas for picking up noise.
The solution is to add a buffer near the sensors so the signal going across the long wires is low impedance.
The cost of this solution is that each sensor will need 3 wires coming from the development board instead of two, and the current consumption of each sensor jumps from effectively nanoamps to some milliamps, but both of these seem acceptable here.

I had some p channel MOSFETs laying around, so I used those for their high input impedance.
I used a simple source follower topology with a 1 kiloohm resistor.
I usually see JFETs used instead of MOSFETs in this kind of application, but it works.
I'm guessing it's because of noise or the high capacitance on MOSFET gates, but either way this works fine here.

The biasing is also dead simple.
The gate is biased to ground through whatever leakage current there is in the MOSFET and the piezoelectric sensor.
This means that the output is biased at the threshold voltage of the MOSFET above ground, nominally 2.5 V in this case.
This gives the circuit a maximum voltage swing of 0.8 V before it hits the positive voltage rail, which should be plenty for the weak signals coming off these piezoelectric sensors.

I also worked out that mounting them so that the center is in contact with the surface while the rest effectively floating doubles or triples the sensor output.
This makes sense, because the piezoelectric sensor actually measures how much its center is flexed compared with its outer edge.
So, when the sensor is attached directly to the surface, the edges vibrate along with the center and the signal is the weak difference between these two.
When the sensor is mounted how I have it set up, the outer edge is effectively "grounded", so the sensor sees the full magnitude of the vibration.
There's probably ways to improve the mounting as I'm sure there's some leakage vibration, but the sensor output along with the amplification using the MSP430's op amps is sufficient for this use case.

# Hardware platform: MSP430FR2355 Launchpad
The main controller is a very capable MSP430FR2355 Launchpad development board, housing an epoynmous MSP430FR2355.
It's crazy how much they fit inside microcontrollers these days, this is definitely a more complicated system than the MSP430G2230 I started with in college.
It has two DACs, and four integrated programmable op amp stages that are perfect for amplifying the signals off of the 3 piezoelectric pickups.

_Here's some pitfalls I spent an extra day debugging for anyone else messing with this microcontroller_
- GPIO pins aren't enabled until you mess with the `LOCKLPM5`, and you need to first unlock the PMM registers to modify `LOCKLMP5`. This is very clearly spelled out in the datasheet, but this is different compared with other microcontrollers in the MSP430 family
- FLLD divides the clock that feeds into MCLK along with into the FLL loop. This means it effectively divides the output clock. For some reason I thought it didn't, and the output could be a multiple of the clock used in the FLL loop. I guess this design is for very precise low frequency clocks
- It seems like if you have a big array in global namespace, the global initialization/zeroing takes so long that the watchdog timer resets the microcontroller before it can finish initialization. You can work around this by using `__attribute__ ((section (".noinit")))` to avoid spending time initializing the arrays during startup

# Signal processing
The overarching approach here is to calculate the cross correlation between each piezoelectric channel, and the peak there should correspond with the time delay between the samples.
Repeat this for all three possible pairs (Channel 1 - Channel 2), (Channel 2 - Channel 3), (Channel 1 - Channel 3), and then you can calculate the position of the knock using triangulation, assuming you know the location of each sensor and they're not collinear.

There're two major ways to calculate the cross correlation.
There's the naive approach, which is to follow the definition and multiply each sum one channel against the other one, shift one channel over one time step, and repeat for each possible offset, and then there's the fast approach, where you take the Fourier transform of each channel, multiply one with the complex conjugate of the other, and then inverse Fourier transform that to get the cross correlation.
This second approach may seem more complicated, but it's generally faster because the algorithmic complex of the naive approach is O(n^2), versus O(n log n) + O(n) + O(n log n) = O(n log n) for the transform-based approach, where the Fourier and inverse Fourier transforms are done via one of the fast Fourier transform methods.

The biggest challenge here is the paltry amount of SRAM on the chip.
The MCU only has 4 KB of RAM, meaning I can only using 1 KB per channel, roughly 10 milliseconds of sound at 50 kSPS.
Unfortunately, the FFT coefficients take up 4 bytes per sample, so either the samples need to be shortened to 5 milliseconds to use the FFT approach, or the slower naive cross correlation method must be used.
Even with the naive cross correlation method, the samples probably need to be shortened to some extent to ensure there's enough scratch space to store intermediate results, and the time it would take with 512 samples would be around 0.3 seconds, which is too long for this application.
So the FFT approach wins.
Fortunately knocks are very short, so even five milliseconds of sample time should be enough.

When your system is based entirely on precise timing, you want the ADC sampling to be precise too.
It turns out it's kind of tricky to get jitter-free(ish) ADC conversions while pushing close to the maximum sample rate.
It turns out it's very easy to take too long processing the sample and setting up for the next one manually, so the final approach was to optimize the ADC interrupt to just storing the ADC value into memory, and use the sequence-of-channels mode of the ADC to automatically setup and begin converting the next channel.
The sequence-of-channels mode is somewhat limited on the MSP430; you can only choose where to start the sequence, and it'll run down from that channel all the way to analog channel 0.
I've tried to stop the conversion before it reaches the the first channel to no avail.
Basically this means I need to pick the analog channels sequentially, starting with analog channel 0, to minimize the time for all the conversions.
But it's also the only way to get the conversions done in the available time slot.
This also eliminates using the first integrated op amp, because it uses the same pins for its operation, but fortunately the remaining three should be just enough here
