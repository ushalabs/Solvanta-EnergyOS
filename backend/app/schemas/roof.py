import math
from pydantic import BaseModel, ConfigDict, Field, model_validator
from shapely.geometry import Polygon


class Point(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra='forbid')
    x: float = Field(ge=0, le=10000)
    y: float = Field(ge=0, le=10000)


class RoofInput(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra='forbid')
    width: float = Field(default=1000, gt=0, le=10000)
    height: float = Field(default=700, gt=0, le=10000)
    boundary: list[Point] = Field(min_length=3, max_length=64)
    obstacles: list[list[Point]] = Field(default_factory=list, max_length=30)
    scale_points: list[Point] = Field(min_length=2, max_length=2)
    scale_distance_m: float = Field(gt=0, le=200)
    setback_m: float = Field(default=0.5, ge=0, le=10)
    panel_width_m: float = Field(default=1.1, ge=0.5, le=3)
    panel_height_m: float = Field(default=2, ge=0.5, le=4)
    gap_m: float = Field(default=0.1, ge=0.02, le=2)
    image_data: str | None = Field(default=None, max_length=3000000, pattern=r'^data:image/(jpeg|png);base64,[A-Za-z0-9+/=]+$')

    @model_validator(mode='after')
    def valid_geometry(self):
        all_points = self.boundary + self.scale_points + [p for ring in self.obstacles for p in ring]
        if any(p.x > self.width or p.y > self.height for p in all_points):
            raise ValueError('All points must lie inside the image canvas')
        roof = Polygon([(p.x, p.y) for p in self.boundary])
        if not roof.is_valid or roof.area <= 0:
            raise ValueError('Roof must be a simple polygon with positive area')
        for ring in self.obstacles:
            if not 3 <= len(ring) <= 64:
                raise ValueError('Obstacles need 3–64 vertices')
            obstacle = Polygon([(p.x, p.y) for p in ring])
            if not obstacle.is_valid or obstacle.area <= 0 or not roof.covers(obstacle):
                raise ValueError('Obstacle must be a valid polygon inside the roof')
        a, b = self.scale_points
        distance = math.hypot(a.x-b.x, a.y-b.y)
        if distance < 1:
            raise ValueError('Scale points must be at least one pixel apart')
        scale = self.scale_distance_m / distance
        if self.width * scale > 200 or self.height * scale > 200:
            raise ValueError('Calibrated canvas must be at most 200 m on each axis')
        return self
