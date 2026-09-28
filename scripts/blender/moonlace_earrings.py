"""Matching pair of Moonlace chandelier earrings with real hooks and links."""
import math
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c
from jewelry import Jeweler

c.reset()
j=Jeweler()
for side in (-1,1):
    x=side*.49
    j.wire('earHook',[(x,.08+.10*math.cos(t),.74+.15*math.sin(t))
                      for t in [i*math.pi*1.65/32 for i in range(33)]],.014)
    j.marquise((x,-.025,.69),.22,.12,mat=j.ice)
    j.chain([(x,-.025,.57),(x,-.025,.40)],.022)
    j.butterfly(x,-.045,.23,.85)
    # Open pointed frame, curled filigree and three independent crystal pendants.
    for direction in (-1,1):
        j.wire('frame',[(x+direction*.25*math.sin(math.pi*t),.005,.42-.74*t)
                        for t in [i/32 for i in range(33)]],.014)
        j.scroll(x+direction*.09,-.01,-.08,direction,.58)
        j.chain([(x+direction*.19,-.015,-.10),(x+direction*.19,-.015,-.43)],.017)
        j.marquise((x+direction*.19,-.015,-.53),.20,.085,mat=j.ice)
    j.chain([(x,-.025,-.31),(x,-.025,-.60)],.020)
    j.marquise((x,-.025,-.79),.36,.15,mat=j.blue)
j.finish()
c.export(c.output_path())
