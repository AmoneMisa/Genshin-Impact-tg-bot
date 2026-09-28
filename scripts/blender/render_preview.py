"""Render an exported GLB under studio lights (validates the shipped geometry).

blender --background --python render_preview.py -- model.glb preview.png
"""
import os
import sys
import bpy
from mathutils import Vector

args=sys.argv[sys.argv.index('--')+1:]
if len(args)!=2:
    raise SystemExit('Expected model.glb preview.png')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(args[0]))
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
corners=[o.matrix_world @ Vector(v) for o in objects for v in o.bound_box]
low=Vector(tuple(min(v[i] for v in corners) for i in range(3)))
high=Vector(tuple(max(v[i] for v in corners) for i in range(3)))
center=(low+high)/2
size=max(high-low)

def aim(obj):
    obj.rotation_euler=(center-obj.location).to_track_quat('-Z','Y').to_euler()

bpy.ops.object.camera_add(location=center+Vector((.08,-3,.20))*size)
camera=bpy.context.object
aim(camera)
camera.data.type='ORTHO'
camera.data.ortho_scale=size*1.24
scene=bpy.context.scene
scene.camera=camera
for name,position,power,color,scale in (
    ('Key',(-1.5,-2,2),450,(.82,.91,1),2),
    ('Fill',(1.5,-1,.4),300,(1,.82,.60),1.5),
    ('Rim',(0,1,1.3),550,(.4,.65,1),1.4)):
    bpy.ops.object.light_add(type='AREA',location=center+Vector(position)*size)
    light=bpy.context.object
    light.name=name
    light.data.energy=power*size*size
    light.data.color=color
    light.data.shape='DISK'
    light.data.size=scale*size
    aim(light)
scene.world=bpy.data.worlds.new('Studio')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.045,.06,.09,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
scene.render.engine='CYCLES'
scene.cycles.samples=48
scene.cycles.use_denoising=True
scene.render.resolution_x=1000
scene.render.resolution_y=1000
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=os.path.abspath(args[1])
os.makedirs(os.path.dirname(scene.render.filepath),exist_ok=True)
bpy.ops.render.render(write_still=True)
