# Setting up Linux on an HP Pavilion 15z
This laptop needed a few tweaks to get it working.
I'm running Manjaro with Linux 5.5.0 as of right now

## Screen not returning from suspend
Switching to a Wayland-based desktop manager fixes this, I'm using `gdm` right now

## WiFi nonfunctional
Installing `rtlwifi_new-extended-dkms` works, aside from the Wifi not working if you do a warm reboot.
The Ethernet connection seems to have some issues with the GNOME desktop, so I switched over to KDE

## No sound
I don't remember exactly what fixed this one, but some combination of using headphones, messing with the mixer levels, and disabling Bluetooth in the Pulseaudio configs did the trick

## Crackling/scratchy sound on headphones
The Realtek ALC295 seems to be slightly misconfigured.
I made a script to change the codec's configuration using `hda-verb` based on the information gathered [here.](https://h30434.www3.hp.com/t5/Notebook-Audio/HP-Models-with-Realtek-ALC295-codec-Linux-Audio-Problem/td-p/6100591)
The script is located [here.](./fix-audio.sh)
This needs to be run on start up and on resume
