"""Reusable solid jewelry geometry. Blender Z-up, presentation front -Y."""
import math
import bpy
from mathutils import Vector
import common as c


class Jeweler:
    def __init__(self):
        self.silver = c.simple_material('moonSilver', (.70, .82, .94), metallic=1, roughness=.23)
        self.gold = c.simple_material('champagneGold', (.83, .57, .25), metallic=1, roughness=.26)
        self.blue = c.simple_material('sapphire', (.025, .16, .48), metallic=.22, roughness=.13,
                                      emission=(.02, .15, .48), strength=.22)
        self.ice = c.simple_material('iceCrystal', (.29, .66, .86), metallic=.25, roughness=.16,
                                     emission=(.12, .4, .65), strength=.12)
        self.parts = {}

    def add(self, obj, mat):
        self.parts.setdefault(mat.name, (mat, []))[1].append(obj)
        return obj

    def wire(self, name, points, radius=.012, mat=None, closed=False):
        return self.add(c.curve_tube(name, points, radius, closed=closed, resolution=1,
                                     bevel_resolution=1), mat or self.silver)

    def bead(self, pos, r=.023, mat=None):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=r, location=pos)
        return self.add(bpy.context.object, mat or self.silver)

    def chain(self, points, radius=.024):
        """Actual interlocking oval links, sampled at approximately one link pitch."""
        points = [Vector(p) for p in points]
        lengths = [(b-a).length for a, b in zip(points, points[1:])]
        total = sum(lengths)
        count = max(2, math.ceil(total / (radius * 1.55)))
        segment, travelled = 0, 0
        for i in range(count + 1):
            distance = total * i / count
            while segment < len(lengths)-1 and travelled + lengths[segment] < distance:
                travelled += lengths[segment]
                segment += 1
            tangent = (points[segment+1] - points[segment]).normalized()
            pos = points[segment].lerp(points[segment+1], (distance-travelled)/lengths[segment])
            across = tangent.cross(Vector((0, 1, 0))).normalized()
            other = tangent.cross(across).normalized()
            angle = math.radians(65 if i % 2 else -10)
            across = across * math.cos(angle) + other * math.sin(angle)
            # Explicit 12 x 5 toroidal mesh: curves oversample hundreds of tiny links.
            normal = tangent.cross(across).normalized()
            verts, faces = [], []
            for k in range(12):
                a=k*math.tau/12
                ring_center=pos+tangent*(radius*1.25*math.cos(a))+across*(radius*.8*math.sin(a))
                radial=(tangent*(math.cos(a)/1.25)+across*(math.sin(a)/.8)).normalized()
                for q in range(5):
                    b=q*math.tau/5
                    verts.append(ring_center+radius*.21*(radial*math.cos(b)+normal*math.sin(b)))
                    faces.append((k*5+q, ((k+1)%12)*5+q,
                                  ((k+1)%12)*5+(q+1)%5, k*5+(q+1)%5))
            self.add(c.mesh_from('chainLink', verts, faces),self.silver)

    def marquise(self, center, length, width, angle=0, mat=None):
        """Closed faceted navette stone with a raised crown and a silver bezel."""
        center = Vector(center)
        def point(x, y, z):
            return center + Vector((x*math.cos(angle)+z*math.sin(angle), y,
                                    z*math.cos(angle)-x*math.sin(angle)))
        outline = [(math.sin(t)*abs(math.sin(t))**.25*width/2, math.cos(t)*length/2)
                   for t in [k*math.tau/12 for k in range(12)]]
        verts = [point(x, 0, z) for x,z in outline]
        verts += [point(x*.55, -width*.25, z*.72) for x,z in outline]
        verts += [point(0, -width*.30, 0), point(0, width*.22, 0)]
        faces = []
        for k in range(12):
            j = (k+1)%12
            faces.extend([(k,j,12+j), (k,12+j,12+k), (12+k,12+j,24), (j,k,25)])
        self.add(c.mesh_from('cutCrystal', verts, faces), mat or self.blue)
        self.wire('bezel', [point(x*1.04,.009,z*1.02) for x,z in outline], .009, closed=True)
        for k in (1,5,7,11):
            x,z=outline[k]
            self.bead(point(x,-.012,z), .012)

    def butterfly(self, x, y, z, scale=1):
        for side in (-1,1):
            self.marquise((x+side*.19*scale,y,z+.13*scale), .48*scale,.19*scale,
                           side*.70, self.blue)
            self.marquise((x+side*.14*scale,y-.012,z-.12*scale), .31*scale,.15*scale,
                           -side*.67, self.ice)
            pts=[(x+side*scale*(.03+.12*t), y, z+scale*(.20+.18*t-.08*t*t))
                 for t in [i/12 for i in range(13)]]
            self.wire('antenna',pts,.009*scale,self.gold)
            self.bead(pts[-1], .018*scale,self.gold)
        self.marquise((x,y-.065,z), .32*scale,.10*scale,mat=self.ice)

    def scroll(self, x, y, z, side, scale=1):
        pts=[]
        for i in range(42):
            t=i/41
            r=scale*(.15*(1-t)+.016)
            a=t*math.tau*1.3
            pts.append((x+side*r*math.cos(a),y,z+r*math.sin(a)))
        self.wire('filigree',pts,.009*scale)

    def finish(self):
        for mat, parts in self.parts.values():
            obj=c.join(parts, mat.name)
            c.set_material(obj,mat)
            if mat in (self.silver,self.gold):
                c.smooth(obj,85)
