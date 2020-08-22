from dataclasses import dataclass


@dataclass
class Position:
    x: float
    y: float
    z: float


@dataclass
class Player:
    name: str
    position: Position
    dimension: str
