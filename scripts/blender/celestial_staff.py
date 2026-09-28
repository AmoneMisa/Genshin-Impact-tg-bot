"""Moon and sun staves, with solid sculpted crests and emissive crystal cores.

The output basename selects the sun variant; all geometry is authored in Blender.
"""
import math
import os
import sys
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import common as c
from jewelry import Jeweler

c.reset()
sun = os.path.basename(c.output_path()) == 'staff-sun.glb'
j = Jeweler()
metal = j.gold if sun else j.silver
shaft = c.simple_material('ivoryEnamel' if sun else 'midnightEnamel',
                          (.62,.45,.25) if sun else (.035,.025,.11), metallic=.5, roughness=.28)
crystal = c.simple_material('solarCrystal' if sun else 'lunarCrystal',
                            (.8,.24,.025) if sun else (.07,.16,.58), metallic=.2,
                            roughness=.17, emission=(1,.35,.04) if sun else (.08,.3,1), strength=.6)
core = c.simple_material('celestialCore',(.95,.67,.17) if sun else (.12,.55,.9),
                         roughness=.22, emission=(1,.55,.08) if sun else (.12,.55,1), strength=2)

def ring(z,radius,thickness=.012):
    j.wire('collar',[(radius*math.cos(a),radius*math.sin(a),z)
                     for a in [i*math.tau/32 for i in range(32)]],thickness,metal,closed=True)

def blade(base, tip, width, material):
    """Ridged leaf-shaped solid, with real thickness and pointed ends."""
    base,tip=Vector(base),Vector(tip)
    axis=tip-base
    cross=Vector((axis.z,0,-axis.x)).normalized()
    middle=base+axis*.42
    verts=[base,tip,middle+cross*width/2,middle-cross*width/2,
           middle+Vector((0,-width*.22,0)),middle+Vector((0,width*.22,0))]
    faces=[(0,2,4),(2,1,4),(1,3,4),(3,0,4),(2,0,5),(1,2,5),(3,1,5),(0,3,5)]
    j.add(c.mesh_from('chasedLeaf',verts,faces),material)

# Tapered enamel shaft, ferrules, fine twisted inlay and a pointed pommel.
sections=[]
for z,r in ((-2.5,.025),(-2.32,.047),(-1.6,.046),(-.5,.060),(.55,.065),(1.35,.080)):
    sections.append([(r*math.cos(a),r*math.sin(a),z) for a in [i*math.tau/24 for i in range(24)]])
j.add(c.smooth(c.loft('enamelShaft',sections),65),shaft)
for z in (-2.31,-1.65,-.8,.20,.75,1.25,1.34):
    for dz in (-.024,.024):
        ring(z+dz,.055 if z<-.8 else .078)
for phase in (0,math.pi):
    pts=[]
    for i in range(160):
        t=i/159
        z=-2.25+3.48*t
        r=.052+.025*t
        a=t*math.tau*3+phase
        pts.append((r*math.cos(a),r*math.sin(a),z))
    j.wire('spiralInlay',pts,.008,metal)
blade((0,0,-2.33),(0,0,-2.75),.14,metal)
for z in (-1.65,-.8,.2,.75):
    j.marquise((0,-.08,z),.20,.075,mat=crystal)
for side in (-1,1):
    blade((0,0,1.15),(side*.29,0,1.73),.20,metal)
    j.scroll(side*.18,-.035,1.30,side,.9)
j.marquise((0,-.12,1.43),.40,.18,mat=crystal)

cz=2.14
if sun:
    # An open solar halo with alternating long and short sculpted rays.
    j.wire('solarHalo',[(.52*math.cos(a),0,cz+.52*math.sin(a))
                        for a in [i*math.tau/80 for i in range(80)]],.029,metal,closed=True)
    for k in range(12):
        a=k*math.tau/12
        r=.88 if k%2==0 else .72
        blade((.47*math.sin(a),0,cz+.47*math.cos(a)),
              (r*math.sin(a),0,cz+r*math.cos(a)),.16,metal)
        j.bead((.52*math.sin(a),-.033,cz+.52*math.cos(a)),.032,crystal)
    for side in (-1,1):
        j.scroll(side*.23,-.04,cz-.23,side,1.5)
    # Four claws connect the core to its halo.
    for k in range(4):
        a=k*math.pi/2
        blade((.50*math.sin(a),0,cz+.50*math.cos(a)),
              (.24*math.sin(a),-.12,cz+.24*math.cos(a)),.11,metal)
else:
    # Crescent with a convex front ridge and a closed back, tapering to two horns.
    sections=[]
    edge=[]
    for i in range(65):
        t=i/64
        a=math.radians(55+250*t)
        width=.26*math.sin(math.pi*t)+.002
        outer=Vector((.68*math.cos(a),0,cz+.68*math.sin(a)))
        inner=Vector(((.68-width)*math.cos(a),0,cz+(.68-width)*math.sin(a)))
        ridge=(outer+inner)/2
        sections.append([outer,ridge+Vector((0,-.095*math.sin(math.pi*t),0)),
                         inner,ridge+Vector((0,.055*math.sin(math.pi*t)+.001,0))])
        edge.append(tuple(outer+Vector((0,-.01,0))))
    j.add(c.loft('crescent',sections),metal)
    j.wire('crescentRim',edge,.013,metal)
    for k in range(7):
        a=math.radians(85+190*k/6)
        j.marquise((.59*math.cos(a),-.085,cz+.59*math.sin(a)),.16,.07,-a,crystal)
    # Fine orbit provides a physical setting for the luminous central orb.
    j.wire('orbSetting',[(.32*math.cos(a),.02,cz+.32*math.sin(a))
                         for a in [i*math.tau/64 for i in range(64)]],.016,metal,closed=True)
    j.wire('settingStem',[(0,0,1.49),(0,.02,cz-.32)],.019,metal)

# A faceted outer jewel with a smaller glowing central cabochon.
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=.255,location=(0,0,cz))
j.add(bpy.context.object,crystal)
bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=.15,location=(0,-.185,cz))
j.add(c.smooth(bpy.context.object,80),core)
for k in range(8):
    a=k*math.tau/8
    j.bead((.29*math.sin(a),-.025,cz+.29*math.cos(a)),.022,metal)
for side in (-1,1):
    x=side*(.44 if sun else .34)
    j.chain([(x,0,1.74),(x,0,1.39 if side<0 else 1.53)],.018)
    j.marquise((x,-.015,1.25 if side<0 else 1.39),.25,.10,mat=crystal)
j.finish()
c.export(c.output_path())
