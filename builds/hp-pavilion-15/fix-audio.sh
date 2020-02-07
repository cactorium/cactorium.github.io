#!/bin/bash

#coeffs=($(echo 0x{16,43,44,5d,5e,63,67}))
#values=($(echo 0x{8020,3405,fa10,0606,0000,e430,3000}))

#coeffs=($(echo 0x{5d,5e,5f,63}))
#values=($(echo 0x{606,0,a3c1,e430}))

#coeffs=($(echo 0x{67}))
#values=($(echo 0x{3000}))

coeffs=($(echo 0x{08,0d,10,37,45,46,49,67}))
values=($(echo 0x{6a0c,a02f,0120,fe15,d689,00f4,249,3000}))
for i in `seq 0 $(( ${#coeffs[@]} - 1 ))`
do
hda-verb /dev/snd/hwC1D0 0x20 SET_COEF_INDEX ${coeffs[$i]} && hda-verb /dev/snd/hwC1D0 0x20 SET_PROC_COEF ${values[$i]}
done
