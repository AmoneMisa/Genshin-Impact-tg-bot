"""Black-and-gold astral coat and matching open-cuff bracers. Front is -Y."""
import math
import os
import sys
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import common as c
from jewelry import Jeweler

c.reset()
j = Jeweler()
cloth = c.simple_material('midnightCloth', (.012,.019,.036), roughness=.62)
lining = c.simple_material('violetLining', (.09,.035,.17), roughness=.43)
ivory = c.simple_material('ivorySilk', (.68,.65,.53), roughness=.4)
leather = c.simple_material('blackLeather', (.018,.014,.023), roughness=.36)
gold = j.gold

def shell(name, fn, material, nu=40, nv=16, closed=False):
    obj=c.surface_grid(name,fn,nu,nv,closed_u=closed)
    mod=obj.modifiers.new('fabricThickness','SOLIDIFY')
    mod.thickness=.012
    c.apply_modifiers(obj)
    c.smooth(obj,70)
    j.add(obj,material)
    return obj

def line(name,fn,mat=gold,r=.012,closed=False):
    j.wire(name,[fn(i/32) for i in range(32 if closed else 33)],r,mat,closed=closed)

def panel(name,points,material):
    obj=c.mesh_from(name,points,[tuple(range(len(points)))])
    mod=obj.modifiers.new('raisedPanel','SOLIDIFY'); mod.thickness=.018
    c.apply_modifiers(obj)
    j.add(obj,material)
    j.wire('panelPiping',points,.009,gold,closed=True)

def cuff(x,z=0,scale=1):
    def shape(u,v,offset=0):
        a=u*math.tau
        r=(.17+.06*v+.012*math.sin(math.pi*v))*scale+offset
        return (x+r*math.sin(a),r*.85*math.cos(a),z+scale*(v*.70-.09*v*math.cos(a)))
    shell('openBracer',shape,leather,48,16,True)
    for v in (.025,.975):
        line('cuffRim',lambda u:shape(u,v,.018*scale),gold,.009*scale,closed=True)
    for side in (-1,1):
        line('cuffVine',lambda t:shape(.5+side*(.015+.10*math.sin(t*math.pi)),
             .10+.80*t,.019*scale),gold,.009*scale)
        for k in range(3):
            line('leafInlay',lambda t:shape(.5+side*(.055+.06*math.sin(t*math.pi)),
                 .17+k*.22+.16*t,.021*scale),gold,.005*scale)
    j.marquise((x,-.215*scale,z+.40*scale),.30*scale,.11*scale,mat=j.blue)

if os.path.basename(c.output_path())=='bracers.glb':
    cuff(-.34)
    cuff(.34)
else:
    # Fitted body, narrower at the waist, with a visible shirt inside the opening.
    profile=[(.44,.25),(.37,.22),(.40,.26),(.56,.29),(.55,.25)]
    def body(u,v):
        f=v*4; i=min(3,int(f)); t=f-i
        t=t*t*(3-2*t)
        rx=profile[i][0]*(1-t)+profile[i+1][0]*t
        ry=profile[i][1]*(1-t)+profile[i+1][1]*t
        a=.20+(math.tau-.40)*u
        return (rx*math.sin(a),-ry*math.cos(a),.10+v*1.18)
    shell('tailoredBodice',body,cloth,48,24)
    shell('shoulderYoke',lambda u,v:((.55-.315*v)*math.sin(.20+u*(math.tau-.40)),
          -(.25-.04*v)*math.cos(.20+u*(math.tau-.40)),1.28+.055*math.sin(v*math.pi)),cloth,40,10)
    shell('shirt',lambda u,v:((u-.5)*(.13+.18*v),-.285,.24+.97*v),ivory,12,16)
    # Open coat skirts with broad folds and contrasting lining.
    def tails(u,v):
        a=.32+(math.tau-.64)*u
        r=.44+v*v*.48+(.028*math.sin(u*math.tau*7+.6*v)+.018*math.sin(u*math.tau*13))*v
        return (r*math.sin(a),-r*.66*math.cos(a)+.13*v*v,
                .12-1.70*v+.12*v*math.cos(a*3))
    shell('coatTails',tails,cloth,64,28)
    for u in (0,1):
        line('frontGoldHem',lambda v:tails(u,v),gold,.014)
    line('bottomGoldHem',lambda u:tails(u,1),gold,.013)
    # Gold stitched branches on both front skirt edges.
    for side in (-1,1):
        for k in range(4):
            z=-.40-k*.28
            x=side*(.22+k*.04)
            j.scroll(x,-.39-k*.037,z,side,.45)
        def lapel(u,v,side=side):
            width=.025+.13*math.sin(math.pi*v)**.7
            x=.065+.21*v+.07*math.sin(math.pi*v)
            return (side*(x+(u-.5)*width),-.30-.055*math.sin(math.pi*v)
                    -.035*math.sin(math.pi*u),.36+.91*v)
        shell('rolledLapel',lapel,cloth,10,24)
        for edge in (0,1):
            line('lapelBraid',lambda v:lapel(edge,v),gold,.008)
        # Sleeves taper towards the wrist and carry restrained elbow folds.
        def sleeve(u,v,side=side):
            a=u*math.tau
            r=.205-.075*v+.012*math.sin(v*math.pi*8)*math.sin(math.pi*v)
            return (side*(.55+.30*v)+r*math.sin(a),r*math.cos(a),1.12-1.09*v)
        shell('sleeve',sleeve,cloth,32,24,True)
        shell('shoulderCap',lambda u,v:(side*.55+.205*v*math.sin(u*math.tau),
              .205*v*math.cos(u*math.tau),1.12+.065*(1-v*v)),cloth,32,8,True)
        for v in (.05,.88,.98):
            line('sleeveTrim',lambda u:sleeve(u,v),gold,.012)
        j.marquise((side*.78,-.15,.16),.23,.09,mat=j.blue)
        # Shoulder epaulette and a modest draped chain.
        def shoulder(u,v,side=side):
            return (side*(.36+.38*u),-.21+.40*v,
                    1.20+.085*math.sin(math.pi*u)+.04*math.sin(math.pi*v))
        shell('curvedEpaulette',shoulder,cloth,12,10)
        for edge in (0,1):
            line('shoulderBraid',lambda u:shoulder(u,edge),gold,.010)
        j.chain([(side*(.4+.29*t),-.255,1.13-.15*math.sin(math.pi*t))
                 for t in [i/24 for i in range(25)]],.018)
    shell('standingCollar',lambda u,v:(.235*math.sin(.4+u*(math.tau-.8)),
          -.21*math.cos(.4+u*(math.tau-.8)),1.24+.25*v),cloth,32,8)
    line('collarTrim',lambda u:(.235*math.sin(.4+u*(math.tau-.8)),
          -.21*math.cos(.4+u*(math.tau-.8)),1.49))
    # Waist belt and gold clasp; buttons remain readable at icon scale.
    shell('belt',lambda u,v:(.40*math.sin(u*math.tau),-.257*math.cos(u*math.tau),.12+.10*v),leather,48,3,True)
    panel('buckle',[(-.11,-.28,.11),(.11,-.28,.11),(.11,-.28,.25),(-.11,-.28,.25)],gold)
    j.marquise((0,-.31,.18),.13,.07,mat=j.blue)
    for z in (.40,.57,.74,.91):
        j.bead((0,-.285,z),.026,gold)
    j.marquise((0,-.26,1.20),.15,.075,mat=j.blue)
j.finish()
c.export(c.output_path())
