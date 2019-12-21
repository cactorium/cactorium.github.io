# RF 915 MHz transceiver design
A UAV obviously needs a camera feed, along with some communication for control, so I've been developing my own transceiver to do the job.

## Discrete design
I decided to get more RF practice in by making my own discrete RF transceiver, aiming for getting the cost down to under $20/board, just to have some reasonably accurate design constraints.
Its target frequency range will be the 915 MHz ISM band, with a target bandwidth of 1-2 Mbits/s (barely enough for video feed) using BPSK/QPSK/QAM and half duplex communication.
It will use an FPGA for signal processing, which mostly discrete or relatively simple ICs for most of the RF processing.
The design is to currently use a pair of diode ring mixers to demodulate the signal into IQ-components in a pretty standard superheterodyne direct conversion design, and feed that into a two channel ADC for conversion.
The DAC is the output of two R-2R ladders fed directly from the FPGA, which will be one a second board along with all the power supplies.
Because the ring mixer works just as well in both directions, switching from ADC to DAC consists of enabling/disabling the right amplifier stages.
I'm using a lot of discrete components just to get a feel for how to design every part of it.

TODO add design picture here

My approach is to test out different sections before making the final board and integrating them all together.
The first part was to test out the RF amplifier section, which I did [here](../iss-amplifier/iss-amplifier.md).
The second part was to characterize the RF mixer, an Infineon BAT99R, which has all four of the matched Schottky diodes packaged in a single IC.

### RF mixer test board

TODO add picture here


## More integrated design
The actual final design will probably just be some standard IF SoC, but it's been pretty difficult to find a SoC that actually has a bitrate as high as 2 MBits/s.
