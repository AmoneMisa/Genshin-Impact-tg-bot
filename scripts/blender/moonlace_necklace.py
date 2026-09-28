"""Moonlace necklace: linked silver collar, sapphire wings and crystal drops."""
import math
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c
from jewelry import Jeweler

c.reset()
j=Jeweler()
# Closed draped collar with depth: upper half recedes behind the neck.
collar=[(.80*math.sin(t), .15*math.cos(t), .58+.66*math.cos(t))
        for t in [i*math.tau/180 for i in range(181)]]
j.chain(collar, .028)
j.butterfly(0,-.19,-.10,1.25)
for side in (-1,1):
    # Graduated leaves and scrolls flank the centerpiece.
    for x,z,a,s in ((.38,.03,.65,.8),(.59,.23,.52,.65),(.74,.48,.3,.5)):
        j.marquise((side*x,-.19,z), .27*s,.13*s,side*a, j.ice)
        j.scroll(side*(x+.025),-.13,z+.105,side,s)
    # Secondary swags hang under the collar without crossing the wings.
    for outer,inner,depth in ((.72,.34,.23),(.62,.18,.40)):
        pts=[(side*(outer+(inner-outer)*t),-.12,.30*(1-t)-depth*math.sin(math.pi*t)-.16*t)
             for t in [i/32 for i in range(33)]]
        j.chain(pts,.018)
    j.chain([(side*.48,-.17,-.12),(side*.48,-.17,-.44)],.020)
    j.marquise((side*.48,-.17,-.56), .24,.10,mat=j.ice)
j.chain([(0,-.19,-.33),(0,-.19,-.65)],.023)
j.marquise((0,-.19,-.85),.40,.17,mat=j.blue)
# Back clasp, with a small contrasting safety ring.
j.wire('clasp',[(.045*math.cos(t),.15,1.25+.065*math.sin(t))
                for t in [i*math.tau/24 for i in range(24)]],.012,j.gold,closed=True)
j.finish()
c.export(c.output_path())
