"""
Color configuration for the DominantColorPlugin.
Defines named colors and their RGB values for color matching.
"""
from typing import Dict, Tuple

# Standard color names mapped to RGB values
COLOR_NAMES: Dict[Tuple[int, int, int], str] = {
    # Reds
    (255, 0, 0): "Red",
    (220, 20, 60): "Crimson",
    (178, 34, 34): "Firebrick",
    (139, 0, 0): "Dark Red",
    (255, 99, 71): "Tomato",
    (255, 69, 0): "Red Orange",

    # Oranges
    (255, 165, 0): "Orange",
    (255, 140, 0): "Dark Orange",
    (255, 127, 80): "Coral",
    (255, 160, 122): "Light Salmon",

    # Yellows
    (255, 255, 0): "Yellow",
    (255, 215, 0): "Gold",
    (255, 255, 224): "Light Yellow",
    (189, 183, 107): "Dark Khaki",

    # Greens
    (0, 255, 0): "Lime",
    (0, 128, 0): "Green",
    (34, 139, 34): "Forest Green",
    (144, 238, 144): "Light Green",
    (60, 179, 113): "Medium Sea Green",
    (46, 139, 87): "Sea Green",
    (128, 128, 0): "Olive",
    (85, 107, 47): "Dark Olive Green",

    # Blues
    (0, 0, 255): "Blue",
    (0, 0, 139): "Dark Blue",
    (0, 191, 255): "Deep Sky Blue",
    (135, 206, 235): "Sky Blue",
    (70, 130, 180): "Steel Blue",
    (25, 25, 112): "Midnight Blue",

    # Cyans
    (0, 255, 255): "Cyan",
    (0, 139, 139): "Dark Cyan",
    (64, 224, 208): "Turquoise",

    # Purples
    (128, 0, 128): "Purple",
    (75, 0, 130): "Indigo",
    (138, 43, 226): "Blue Violet",
    (147, 112, 219): "Medium Purple",
    (216, 191, 216): "Thistle",
    (221, 160, 221): "Plum",
    (238, 130, 238): "Violet",
    (255, 0, 255): "Magenta",

    # Pinks
    (255, 192, 203): "Pink",
    (255, 182, 193): "Light Pink",
    (255, 105, 180): "Hot Pink",
    (219, 112, 147): "Pale Violet Red",

    # Browns
    (165, 42, 42): "Brown",
    (139, 69, 19): "Saddle Brown",
    (160, 82, 45): "Sienna",
    (210, 105, 30): "Chocolate",
    (244, 164, 96): "Sandy Brown",
    (222, 184, 135): "Burlywood",
    (210, 180, 140): "Tan",

    # Neutrals
    (255, 255, 255): "White",
    (220, 220, 220): "Gainsboro",
    (211, 211, 211): "Light Gray",
    (192, 192, 192): "Silver",
    (169, 169, 169): "Dark Gray",
    (128, 128, 128): "Gray",
    (105, 105, 105): "Dim Gray",
    (0, 0, 0): "Black",

    # Beiges & Creams
    (245, 245, 220): "Beige",
    (255, 248, 220): "Cornsilk",
    (255, 250, 240): "Floral White",
    (250, 240, 230): "Linen",
    (255, 239, 213): "Papaya Whip",
    (255, 228, 196): "Bisque",
}


def get_color_name(rgb: Tuple[int, int, int]) -> str:
    """
    Find the closest named color to the given RGB value.

    Args:
        rgb: RGB color tuple (r, g, b) where each value is 0-255

    Returns:
        The name of the closest matching color
    """
    min_distance = float('inf')
    closest_name = "Unknown"

    for known_rgb, name in COLOR_NAMES.items():
        # Calculate Euclidean distance in RGB space
        distance = sum((a - b) ** 2 for a, b in zip(rgb, known_rgb))
        if distance < min_distance:
            min_distance = distance
            closest_name = name

    return closest_name


def rgb_to_hex(rgb: Tuple[int, int, int]) -> str:
    """
    Convert RGB tuple to hexadecimal color code.

    Args:
        rgb: RGB color tuple (r, g, b) where each value is 0-255

    Returns:
        Hex color code string (e.g., '#ff0000')
    """
    return '#{:02x}{:02x}{:02x}'.format(*rgb)
