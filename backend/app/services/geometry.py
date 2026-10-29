"""Conservative fixed-orientation grid placement; not a global packing optimum."""
import math
from shapely.geometry import Polygon, box
from shapely.ops import unary_union
from ..schemas.roof import RoofInput


def place_panels(data: RoofInput) -> dict:
    a, b = data.scale_points
    scale = data.scale_distance_m / math.hypot(a.x-b.x, a.y-b.y)
    def polygon(points):
        return Polygon([(p.x*scale, p.y*scale) for p in points])
    roof = polygon(data.boundary)
    usable = roof.buffer(-data.setback_m, join_style=2)
    if data.obstacles:
        usable = usable.difference(unary_union([polygon(r).buffer(data.setback_m, join_style=2) for r in data.obstacles]))
    panels = []
    if not usable.is_empty:
        minx, miny, maxx, maxy = usable.bounds
        dx, dy = data.panel_width_m + data.gap_m, data.panel_height_m + data.gap_m
        cols = max(0, math.floor((maxx-minx-data.panel_width_m)/dx)+1)
        rows = max(0, math.floor((maxy-miny-data.panel_height_m)/dy)+1)
        if cols * rows > 40000:
            raise ValueError('Placement exceeds 40,000 candidates; reduce canvas size or increase panel footprint')
        for row in range(rows):
            for col in range(cols):
                x, y = minx+col*dx, miny+row*dy
                footprint = box(x, y, x+data.panel_width_m, y+data.panel_height_m)
                if usable.covers(footprint):
                    panels.append({'x': x/scale, 'y': y/scale, 'width': data.panel_width_m/scale, 'height': data.panel_height_m/scale})
    return {'roof_area_m2': round(roof.area, 4), 'usable_area_m2': round(usable.area, 4),
            'panel_count': len(panels), 'panels': panels, 'meters_per_pixel': scale,
            'method': 'Fixed grid, measured scale; preliminary, no structural or shading assessment'}
