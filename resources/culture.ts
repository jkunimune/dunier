export default [
  {
    "key": "type", "chance": 1.0, "features": [
      {
        "key": "type", "newWord": false, "values": [
          { "key": "nomadic", "klas": "nomadic", "conditions": ["+plains", "+free"] },
          { "key": "sedentary", "klas": "sedentary", "conditions": [] }
        ]
      }
    ]
  },
  {
    "key": "skill", "chance": 1.0, "features": [
      {
        "key": "skill", "newWord": true, "values": [
          { "key": "painting", "klas": "none", "conditions": [] },
          { "key": "sandpainting", "klas": "none", "conditions": ["+coastal"] },
          { "key": "sculpture", "klas": "none", "conditions": [] },
          { "key": "carving", "klas": "none", "conditions": [] },
          { "key": "printing", "klas": "none", "conditions": ["tech>200"] },
          { "key": "mosaic", "klas": "none", "conditions": [] },
          { "key": "geoglyph", "klas": "none", "conditions": [] },
          { "key": "storytelling", "klas": "none", "conditions": [] },
          { "key": "monuments", "klas": "none", "conditions": [] },
          { "key": "conservative", "klas": "none", "conditions": [] },
          { "key": "liberal", "klas": "none", "conditions": [] },
          { "key": "metric_system", "klas": "none", "conditions": [] },
          { "key": "roads", "klas": "none", "conditions": [] },
          { "key": "mustache", "klas": "none", "conditions": [] },
          { "key": "piercings", "klas": "none", "conditions": [] },
          { "key": "jewelry", "klas": "none", "conditions": [] },
          { "key": "body_paint", "klas": "none", "conditions": [] },
          { "key": "makeup", "klas": "none", "conditions": [] },
          { "key": "tattoos", "klas": "none", "conditions": [] },
          { "key": "scarring", "klas": "none", "conditions": [] },
          { "key": "irrigation", "klas": "none", "conditions": [] },
          { "key": "spear", "klas": "none", "conditions": [] },
          { "key": "archery", "klas": "none", "conditions": [] },
          { "key": "sword", "klas": "none", "conditions": ["tech>-1600"] },
          { "key": "rifle", "klas": "none", "conditions": ["tech>1740"] },
          { "key": "fistery", "klas": "none", "conditions": [] },
          { "key": "pottery", "klas": "none", "conditions": [] },
          { "key": "metalworking", "klas": "none", "conditions": [] },
          { "key": "woodworking", "klas": "none", "conditions": [] },
          { "key": "glassworking", "klas": "none", "conditions": ["tech>-2500"] },
          { "key": "fireworks", "klas": "none", "conditions": ["tech>1110"] },
          { "key": "horseback", "klas": "none", "conditions": [] },
          { "key": "elephant", "klas": "none", "conditions": ["-cold", "-barren"] },
          { "key": "seafaring", "klas": "none", "conditions": ["tech>-2100", "+coastal"] },
          { "key": "flying", "klas": "none", "conditions": ["tech>1903"] },
          { "key": "cinema", "klas": "none", "conditions": ["tech>1888"] },
          { "key": "theatre", "klas": "none", "conditions": [] },
          { "key": "weaving", "klas": "none", "conditions": [] },
          { "key": "alcohol", "klas": "none", "conditions": [] },
          { "key": "massages", "klas": "none", "conditions": [] },
          { "key": "puppetry", "klas": "none", "conditions": [] },
          { "key": "wirecraft", "klas": "none", "conditions": ["tech>1850"] },
          { "key": "terraces", "klas": "none", "conditions": ["+mountainous"] },
          { "key": "navigation", "klas": "none", "conditions": [] },
          { "key": "hospitals", "klas": "none", "conditions": [] },
          { "key": "dams", "klas": "none", "conditions": [] },
          { "key": "knots", "klas": "none", "conditions": [] },
          { "key": "fabric", "klas": "none", "conditions": [] },
          { "key": "fishing", "klas": "none", "conditions": [] },
          { "key": "bluntness", "klas": "none", "conditions": [] }
        ]
      }
    ]
  },
  {
    "key": "clothes", "chance": 0.3, "features": [
      {
        "key": "person", "newWord": false, "values": [
          { "key": "people", "klas": "none", "conditions": [] },
          { "key": "men", "klas": "men", "conditions": [] },
          { "key": "women", "klas": "women", "conditions": [] },
          { "key": "elders", "klas": "none", "conditions": [] },
          { "key": "soldiers", "klas": "none", "conditions": [] },
          { "key": "leaders", "klas": "none", "conditions": [] },
          { "key": "clerics", "klas": "none", "conditions": [] },
          { "key": "aristocrats", "klas": "none", "conditions": [] },
          { "key": "rich", "klas": "none", "conditions": ["tech>-700", "+sedentary"] },
          { "key": "dancers", "klas": "none", "conditions": [] },
          { "key": "grooms", "klas": "none", "conditions": [] },
          { "key": "brides", "klas": "none", "conditions": [] }
        ]
      },
      {
        "key": "type", "newWord": true, "values": [
          { "key": "turban", "klas": "fabric", "conditions": [] },
          { "key": "hairpin", "klas": "hairpin", "conditions": [] },
          { "key": "vest", "klas": "fabric", "conditions": [] },
          { "key": "mask", "klas": "fabric", "conditions": [] },
          { "key": "veil", "klas": "fabric", "conditions": [] },
          { "key": "sash", "klas": "fabric", "conditions": [] },
          { "key": "skirt", "klas": "fabric", "conditions": [] },
          { "key": "drape", "klas": "fabric", "conditions": [] },
          { "key": "cape", "klas": "fabric", "conditions": [] },
          { "key": "tunic", "klas": "fabric", "conditions": [] },
          { "key": "belt", "klas": "fabric", "conditions": [] },
          { "key": "neckerchief", "klas": "fabric", "conditions": ["-humid"] },
          { "key": "pants", "klas": "fabric", "conditions": ["-humid"] },
          { "key": "sleeve", "klas": "fabric", "conditions": ["-humid"] },
          { "key": "scarf", "klas": "fabric", "conditions": ["-humid"] },
          { "key": "headscarf", "klas": "fabric", "conditions": ["-humid"] },
          { "key": "shawl", "klas": "fabric", "conditions": ["-humid"] },
          { "key": "coat", "klas": "fabric", "conditions": ["-humid"] },
          { "key": "robe", "klas": "fabric", "conditions": ["-humid"] },
          { "key": "dress", "klas": "fabric", "conditions": ["-humid"] },
          { "key": "chestwrap", "klas": "fabric", "conditions": ["+hot"] },
          { "key": "waistwrap", "klas": "fabric", "conditions": ["+hot"] },
          { "key": "wings", "klas": "none", "conditions": [] },
          { "key": "hat", "klas": "none", "conditions": [] },
          { "key": "big_hat", "klas": "none", "conditions": [] },
          { "key": "small_hat", "klas": "none", "conditions": [] },
          { "key": "amulet", "klas": "none", "conditions": [] },
          { "key": "shoe", "klas": "none", "conditions": [] },
          { "key": "pendant", "klas": "none", "conditions": [] },
          { "key": "necklace", "klas": "none", "conditions": [] },
          { "key": "tail", "klas": "none", "conditions": [] },
          { "key": "wig", "klas": "none", "conditions": [] },
          { "key": "earring", "klas": "none", "conditions": [] },
          { "key": "bracelet", "klas": "none", "conditions": [] },
          { "key": "anklet", "klas": "none", "conditions": ["-cold"] },
          { "key": "cord", "klas": "none", "conditions": [] },
          { "key": "eyepiece", "klas": "none", "conditions": ["tech>1100"] }
        ]
      },
      {
        "key": "attribute", "newWord": false, "values": [
          { "key": "colorful", "klas": "colored_clothes", "conditions": [] },
          { "key": "sapphire", "klas": "colored_clothes", "conditions": [] },
          { "key": "ruby", "klas": "colored_clothes", "conditions": [] },
          { "key": "emerald", "klas": "colored_clothes", "conditions": [] },
          { "key": "amber", "klas": "colored_clothes", "conditions": [] },
          { "key": "golden", "klas": "colored_clothes", "conditions": [] },
          { "key": "silver", "klas": "colored_clothes", "conditions": [] },
          { "key": "white", "klas": "colored_clothes", "conditions": [] },
          { "key": "black", "klas": "colored_clothes", "conditions": [] },
          { "key": "shiny", "klas": "none", "conditions": ["tech>698"] },
          { "key": "fluorescent", "klas": "none", "conditions": ["tech>1852"] },
          { "key": "iridescent", "klas": "none", "conditions": ["tech>698"] },
          { "key": "glowing", "klas": "none", "conditions": ["+coastal"] },
          { "key": "intricate", "klas": "none", "conditions": ["-hot"] },
          { "key": "feathered", "klas": "none", "conditions": [] },
          { "key": "sequined", "klas": "none", "conditions": [] },
          { "key": "extravagant", "klas": "none", "conditions": ["-hot"] },
          { "key": "jeweled", "klas": "none", "conditions": [] },
          { "key": "shelled", "klas": "none", "conditions": ["+coastal", "-cold"] },
          { "key": "pearled", "klas": "none", "conditions": ["+coastal", "-cold"] },
          { "key": "decorated", "klas": "none", "conditions": [] },
          { "key": "ceremonial", "klas": "none", "conditions": [] },
          { "key": "calligraphic", "klas": "none", "conditions": [] },
          { "key": "ribboned", "klas": "none", "conditions": [] },
          { "key": "flowered", "klas": "none", "conditions": [] },
          { "key": "belled", "klas": "none", "conditions": ["tech>-600"] },
          { "key": "pointy", "klas": "none", "conditions": [] },
          { "key": "fur", "klas": "none", "conditions": ["+cold"] },
          { "key": "grass", "klas": "none", "conditions": ["-barren"] },
          { "key": "barkcloth", "klas": "none", "conditions": ["+fabric", "-barren"] },
          { "key": "thick", "klas": "none", "conditions": ["+fabric", "+cold"] },
          { "key": "leather", "klas": "none", "conditions": ["+fabric", "-humid"] },
          { "key": "tiedyed", "klas": "none", "conditions": ["+fabric"] },
          { "key": "flowing", "klas": "none", "conditions": ["+fabric"] },
          { "key": "loose", "klas": "none", "conditions": ["+fabric"] },
          { "key": "tight", "klas": "none", "conditions": ["+fabric", "-sandy"] },
          { "key": "pleated", "klas": "none", "conditions": ["+fabric"] },
          { "key": "layered", "klas": "none", "conditions": ["+fabric", "+cold"] },
          { "key": "voluminous", "klas": "none", "conditions": ["+fabric", "+cold"] },
          { "key": "embroidered", "klas": "none", "conditions": ["+fabric"] },
          { "key": "patterned", "klas": "none", "conditions": ["+fabric"] },
          { "key": "aloha", "klas": "none", "conditions": ["+fabric"] }
        ]
      },
      {
        "key": "hair", "newWord": false, "values": [
          { "key": "short", "klas": "none", "conditions": ["-hairpin"] },
          { "key": "medium", "klas": "none", "conditions": ["-hairpin"] },
          { "key": "long", "klas": "none", "conditions": ["-hairpin", "-men"] },
          { "key": "bushy", "klas": "none", "conditions": ["-hairpin"] },
          { "key": "bun", "klas": "none", "conditions": [] },
          { "key": "loop", "klas": "none", "conditions": [] },
          { "key": "tail", "klas": "none", "conditions": ["-men"] },
          { "key": "braid", "klas": "none", "conditions": ["-men"] },
          { "key": "tails", "klas": "none", "conditions": ["-men"] },
          { "key": "knots", "klas": "none", "conditions": [] },
          { "key": "braids", "klas": "none", "conditions": [] },
          { "key": "elaborate", "klas": "none", "conditions": [] },
          { "key": "shaved", "klas": "none", "conditions": ["-hairpin"] },
          { "key": "partial", "klas": "none", "conditions": [] },
          { "key": "lateral", "klas": "none", "conditions": [] },
          { "key": "ornamented", "klas": "none", "conditions": [] },
          { "key": "sculpted", "klas": "none", "conditions": [] },
          { "key": "sideburns", "klas": "none", "conditions": ["-women"] },
          { "key": "buzzed", "klas": "none", "conditions": ["-hairpin", "tech>1900"] },
          { "key": "greased", "klas": "none", "conditions": ["tech>1000"] },
          { "key": "colorful", "klas": "none", "conditions": ["tech>1850"] }
        ]
      }
    ]
  },
  {
    "key": "food", "chance": 0.3, "features": [
      {
        "key": "attribute", "newWord": false, "values": [
          { "key": "bland", "klas": "none", "conditions": [] },
          { "key": "sweet", "klas": "none", "conditions": [] },
          { "key": "bitter", "klas": "none", "conditions": [] },
          { "key": "sour", "klas": "none", "conditions": [] },
          { "key": "salty", "klas": "none", "conditions": [] },
          { "key": "savory", "klas": "none", "conditions": [] },
          { "key": "spicy", "klas": "none", "conditions": [] },
          { "key": "pickled", "klas": "none", "conditions": [] },
          { "key": "smoked", "klas": "none", "conditions": [] },
          { "key": "steamed", "klas": "none", "conditions": [] },
          { "key": "fried", "klas": "none", "conditions": [] },
          { "key": "baked", "klas": "none", "conditions": [] },
          { "key": "saucy", "klas": "none", "conditions": [] },
          { "key": "chewy", "klas": "none", "conditions": [] },
          { "key": "dry", "klas": "none", "conditions": [] },
          { "key": "liquid", "klas": "none", "conditions": [] },
          { "key": "hot", "klas": "none", "conditions": ["-hot"] },
          { "key": "cold", "klas": "none", "conditions": ["tech>1911", "-cold"] }
        ]
      },
      {
        "key": "base", "newWord": true, "values": [
          { "key": "cereal", "klas": "none", "conditions": ["-cold"] },
          { "key": "rice", "klas": "none", "conditions": ["-dry"] },
          { "key": "tuber", "klas": "none", "conditions": ["+cold"] },
          { "key": "corn", "klas": "none", "conditions": ["+plains"] },
          { "key": "meat", "klas": "none", "conditions": [] },
          { "key": "fish", "klas": "none", "conditions": [] },
          { "key": "fruit", "klas": "none", "conditions": [] },
          { "key": "nuts", "klas": "none", "conditions": [] },
          { "key": "beans", "klas": "none", "conditions": [] },
          { "key": "cheese", "klas": "none", "conditions": [] },
          { "key": "fermented", "klas": "none", "conditions": [] },
          { "key": "insect", "klas": "none", "conditions": [] },
          { "key": "dessert", "klas": "none", "conditions": [] },
          { "key": "group", "klas": "none", "conditions": [] }
        ]
      }
    ]
  },
  {
    "key": "drug", "chance": 0.3, "features": [
      {
        "key": "time", "newWord": false, "values": [
          { "key": "often", "klas": "none", "conditions": [] },
          { "key": "usually", "klas": "none", "conditions": [] },
          { "key": "always", "klas": "none", "conditions": [] }
        ]
      },
      {
        "key": "act", "newWord": false, "values": [
          { "key": "drink", "klas": "none", "conditions": [] },
          { "key": "chew", "klas": "none", "conditions": [] },
          { "key": "smoke", "klas": "none", "conditions": [] }
        ]
      },
      {
        "key": "attribute", "newWord": false, "values": [
          { "key": "caffeine", "klas": "none", "conditions": [] },
          { "key": "sedative", "klas": "none", "conditions": [] },
          { "key": "alcoholic", "klas": "none", "conditions": [] },
          { "key": "sweet", "klas": "none", "conditions": [] },
          { "key": "bitter", "klas": "none", "conditions": [] }
        ]
      },
      {
        "key": "effect", "newWord": true, "values": [
          { "key": "leaf", "klas": "none", "conditions": ["-plains"] },
          { "key": "seed", "klas": "none", "conditions": [] },
          { "key": "sap", "klas": "none", "conditions": [] },
          { "key": "fruit", "klas": "none", "conditions": [] }
        ]
      }
    ]
  },
  {
    "key": "house", "chance": 0.3, "features": [
      {
        "key": "wall", "newWord": false, "values": [
          { "key": "pelt", "klas": "none", "conditions": ["+nomadic"] },
          { "key": "cloth", "klas": "none", "conditions": ["+nomadic"] },
          { "key": "wood", "klas": "none", "conditions": ["+sedentary", "-plains"] },
          { "key": "mud", "klas": "none", "conditions": ["+sedentary"] },
          { "key": "mudbrick", "klas": "none", "conditions": ["+sedentary"] },
          { "key": "cob", "klas": "none", "conditions": ["+sedentary"] },
          { "key": "adobe", "klas": "none", "conditions": ["+sedentary"] },
          { "key": "clay", "klas": "none", "conditions": ["+sedentary"] },
          { "key": "snowbrick", "klas": "none", "conditions": ["+sedentary", "+cold", "+plains"] },
          { "key": "marble", "klas": "none", "conditions": ["+sedentary"] },
          { "key": "concrete", "klas": "none", "conditions": ["+sedentary", "tech>-800"] },
          { "key": "steel", "klas": "none", "conditions": ["+sedentary", "tech>1000"] },
          { "key": "floating", "klas": "floating", "conditions": ["+coastal", "-cold"] }
        ]
      },
      {
        "key": "roof", "newWord": false, "values": [
          { "key": "none", "klas": "none", "conditions": ["+nomadic"] },
          { "key": "thatching", "klas": "none", "conditions": ["+sedentary", "-plains"] },
          { "key": "claytile", "klas": "none", "conditions": ["+sedentary", "-cold"] },
          { "key": "terracottatile", "klas": "none", "conditions": ["+sedentary"] },
          { "key": "slatetile", "klas": "none", "conditions": ["+sedentary"] },
          { "key": "metal", "klas": "none", "conditions": ["+sedentary", "tech>1840"] },
          { "key": "metaltile", "klas": "none", "conditions": ["+sedentary", "tech>-300"] }
        ]
      }
    ]
  },
  {
    "key": "building", "chance": 0.3, "features": [
      {
        "key": "feature", "newWord": false, "values": [
          { "key": "color", "klas": "colorful_building", "conditions": [] },
          { "key": "gold", "klas": "none", "conditions": [] },
          { "key": "bridge", "klas": "bridge", "conditions": [] },
          { "key": "gate", "klas": "gate", "conditions": [] },
          { "key": "door", "klas": "door", "conditions": [] },
          { "key": "wall", "klas": "wall", "conditions": [] },
          { "key": "ceiling", "klas": "ceiling", "conditions": [] },
          { "key": "roof", "klas": "none", "conditions": [] },
          { "key": "window", "klas": "window", "conditions": [] },
          { "key": "eave", "klas": "eave", "conditions": [] },
          { "key": "parapet", "klas": "parapet", "conditions": [] },
          { "key": "keystone", "klas": "keystone", "conditions": [] },
          { "key": "column", "klas": "column", "conditions": [] },
          { "key": "pedestal", "klas": "pedestal", "conditions": [] },
          { "key": "turret", "klas": "turret", "conditions": [] },
          { "key": "dome", "klas": "dome", "conditions": ["tech>-300"] },
          { "key": "arch", "klas": "arch", "conditions": [] },
          { "key": "bracket", "klas": "bracket", "conditions": ["tech>1200"] },
          { "key": "spire", "klas": "spire", "conditions": [] },
          { "key": "minaret", "klas": "minaret", "conditions": [] },
          { "key": "aqueduct", "klas": "aqueduct", "conditions": [] },
          { "key": "belfry", "klas": "belfry", "conditions": [] },
          { "key": "porch", "klas": "porch", "conditions": [] },
          { "key": "courtyard", "klas": "none", "conditions": [] },
          { "key": "garden", "klas": "none", "conditions": [] },
          { "key": "fountain", "klas": "fountain", "conditions": [] },
          { "key": "sculpture", "klas": "none", "conditions": [] },
          { "key": "stucco", "klas": "none", "conditions": ["tech>200"] },
          { "key": "glass", "klas": "none", "conditions": [] },
          { "key": "utilitarianism", "klas": "utilitarian_building", "conditions": [] },
          { "key": "stilts", "klas": "none", "conditions": ["+coastal", "-floating"] }
        ]
      },
      {
        "key": "depictor", "newWord": false, "values": [
          { "key": "color", "klas": "none", "conditions": ["-colorful_building", "-utilitarian_building"] },
          { "key": "bridge", "klas": "none", "conditions": ["-bridge"] },
          { "key": "gate", "klas": "none", "conditions": ["-gate"] },
          { "key": "door", "klas": "none", "conditions": ["-door"] },
          { "key": "wall", "klas": "none", "conditions": ["-wall"] },
          { "key": "ceiling", "klas": "none", "conditions": ["-ceiling"] },
          { "key": "window", "klas": "none", "conditions": ["-window", "-utilitarian_building"] },
          { "key": "eave", "klas": "none", "conditions": ["-eave"] },
          { "key": "parapet", "klas": "none", "conditions": ["-parapet"] },
          { "key": "keystone", "klas": "none", "conditions": ["-keystone"] },
          { "key": "column", "klas": "none", "conditions": ["-column"] },
          { "key": "pedestal", "klas": "none", "conditions": ["-pedestal"] },
          { "key": "turret", "klas": "none", "conditions": ["-turret"] },
          { "key": "dome", "klas": "none", "conditions": ["-dome", "-utilitarian_building", "tech>-300"] },
          { "key": "arch", "klas": "none", "conditions": ["-arch", "-utilitarian_building"] },
          { "key": "bracket", "klas": "none", "conditions": ["-bracket", "-utilitarian_building", "tech>1200"] },
          { "key": "spire", "klas": "none", "conditions": ["-spire"] },
          { "key": "minaret", "klas": "none", "conditions": ["-minaret"] },
          { "key": "aqueduct", "klas": "none", "conditions": ["-aqueduct"] },
          { "key": "belfry", "klas": "none", "conditions": ["-belfry"] },
          { "key": "porch", "klas": "none", "conditions": ["-porch"] },
          { "key": "fountain", "klas": "none", "conditions": ["-fountain", "-utilitarian_building"] }
        ]
      },
      {
        "key": "depiction", "newWord": true, "values": [
          { "key": "gods", "klas": "none", "conditions": [] },
          { "key": "spirits", "klas": "none", "conditions": [] },
          { "key": "plants", "klas": "none", "conditions": [] },
          { "key": "animals", "klas": "none", "conditions": [] },
          { "key": "birds", "klas": "none", "conditions": [] },
          { "key": "fish", "klas": "none", "conditions": ["-dry"] },
          { "key": "serpents", "klas": "none", "conditions": [] },
          { "key": "cats", "klas": "none", "conditions": [] },
          { "key": "dragons", "klas": "none", "conditions": [] },
          { "key": "flowers", "klas": "none", "conditions": [] },
          { "key": "trees", "klas": "none", "conditions": ["-plains"] },
          { "key": "rivers", "klas": "none", "conditions": [] },
          { "key": "stars", "klas": "none", "conditions": ["+day_night_cycle"] },
          { "key": "sun", "klas": "none", "conditions": [] },
          { "key": "moon", "klas": "none", "conditions": ["+day_night_cycle"] },
          { "key": "eclipse", "klas": "none", "conditions": ["+day_night_cycle"] },
          { "key": "maps", "klas": "none", "conditions": [] },
          { "key": "events", "klas": "none", "conditions": [] },
          { "key": "celebrities", "klas": "none", "conditions": [] },
          { "key": "politicians", "klas": "none", "conditions": [] },
          { "key": "commoners", "klas": "none", "conditions": [] },
          { "key": "lava", "klas": "none", "conditions": ["+mountainous"] },
          { "key": "aliens", "klas": "have_seen_aliens", "conditions": [] },
          { "key": "monsters", "klas": "none", "conditions": [] },
          { "key": "shapes", "klas": "none", "conditions": [] }
        ]
      }
    ]
  },
  {
    "key": "art", "chance": 0.3, "features": [
      {
        "key": "style", "newWord": false, "values": [
        { "key": "squares", "klas": "none", "conditions": [] },
          { "key": "circles", "klas": "none", "conditions": [] },
          { "key": "stars", "klas": "none", "conditions": [] },
          { "key": "hexagons", "klas": "none", "conditions": [] },
          { "key": "swirls", "klas": "none", "conditions": [] },
          { "key": "labyrinths", "klas": "none", "conditions": [] },
          { "key": "lines", "klas": "none", "conditions": [] },
          { "key": "tesselation", "klas": "none", "conditions": [] },
          { "key": "parallels", "klas": "none", "conditions": [] },
          { "key": "segments", "klas": "none", "conditions": [] },
          { "key": "bright_colors", "klas": "none", "conditions": [] },
          { "key": "weird_colors", "klas": "none", "conditions": [] },
          { "key": "weird_sun", "klas": "none", "conditions": [] },
          { "key": "weird_clouds", "klas": "none", "conditions": [] },
          { "key": "weird_ocean", "klas": "none", "conditions": ["+coastal"] },
          { "key": "people_no_arms", "klas": "humancentric_art", "conditions": [] },
          { "key": "people_no_legs", "klas": "humancentric_art", "conditions": [] },
          { "key": "people_triangular", "klas": "humancentric_art", "conditions": [] },
          { "key": "people_big_heads", "klas": "humancentric_art", "conditions": ["-have_seen_aliens"] }
        ]
      },
      {
        "key": "subject", "newWord": true, "values": [
          { "key": "ma", "klas": "none", "conditions": [] },
          { "key": "realism", "klas": "none", "conditions": [] },
          { "key": "scale", "klas": "none", "conditions": [] },
          { "key": "asymmetry", "klas": "none", "conditions": [] },
          { "key": "miniature", "klas": "none", "conditions": [] },
          { "key": "colossus", "klas": "none", "conditions": [] },
          { "key": "calligraphy", "klas": "none", "conditions": [] },
          { "key": "lighting", "klas": "none", "conditions": [] },
          { "key": "fractal", "klas": "none", "conditions": [] },
          { "key": "faces", "klas": "none", "conditions": [] },
          { "key": "cats", "klas": "none", "conditions": [] },
          { "key": "fraternity", "klas": "none", "conditions": [] },
          { "key": "mortality", "klas": "none", "conditions": [] },
          { "key": "fertility", "klas": "none", "conditions": [] },
          { "key": "piety", "klas": "none", "conditions": [] },
          { "key": "jihad", "klas": "none", "conditions": [] },
          { "key": "nature", "klas": "none", "conditions": ["-humancentric_art"] },
          { "key": "sex", "klas": "none", "conditions": [] },
          { "key": "romance", "klas": "none", "conditions": [] }
        ]
      }
    ]
  },
  {
    "key": "music", "chance": 0.3, "features": [
      {
        "key": "feature", "newWord": false, "values": [
          { "key": "tetratonic", "klas": "none", "conditions": [] },
          { "key": "pentatonic", "klas": "none", "conditions": [] },
          { "key": "hexatonic", "klas": "none", "conditions": [] },
          { "key": "heptatonic", "klas": "none", "conditions": [] },
          { "key": "chromatic", "klas": "none", "conditions": [] },
          { "key": "quarter", "klas": "none", "conditions": [] },
          { "key": "fifths", "klas": "none", "conditions": [] },
          { "key": "harmony", "klas": "none", "conditions": [] },
          { "key": "rapid", "klas": "none", "conditions": [] },
          { "key": "slow", "klas": "none", "conditions": [] },
          { "key": "asymmetric", "klas": "none", "conditions": [] },
          { "key": "polyrhythm", "klas": "none", "conditions": [] },
          { "key": "audience", "klas": "none", "conditions": [] },
          { "key": "fluid", "klas": "none", "conditions": [] },
          { "key": "aggressive", "klas": "none", "conditions": [] },
          { "key": "energetic", "klas": "none", "conditions": [] },
          { "key": "costumed", "klas": "none", "conditions": [] },
          { "key": "narrative", "klas": "none", "conditions": [] },
          { "key": "repetition", "klas": "none", "conditions": [] }
        ]
      },
      {
        "key": "type", "newWord": false, "values": [
          { "key": "percussion", "klas": "percussion", "conditions": [] },
          { "key": "vocals", "klas": "vocals", "conditions": [] },
          { "key": "wind", "klas": "wind_instrument", "conditions": [] },
          { "key": "string", "klas": "string_instrument", "conditions": [] },
        ]
      },
      {
        "key": "instrument", "newWord": true, "values": [
          { "key": "pitched_perc", "klas": "none", "conditions": ["-percussion"] },
          { "key": "drums", "klas": "none", "conditions": ["-percussion"] },
          { "key": "bell", "klas": "none", "conditions": ["-percussion", "tech>-600"] },
          { "key": "cymbals", "klas": "none", "conditions": ["-percussion"] },
          { "key": "rattle", "klas": "none", "conditions": ["-percussion"] },
          { "key": "gourd", "klas": "none", "conditions": ["-percussion"] },
          { "key": "choir", "klas": "none", "conditions": ["-vocals"] },
          { "key": "overtone", "klas": "none", "conditions": ["-vocals"] },
          { "key": "ululating", "klas": "none", "conditions": ["-vocals"] },
          { "key": "falsetto", "klas": "none", "conditions": ["-vocals"] },
          { "key": "chanting", "klas": "none", "conditions": ["-vocals"] },
          { "key": "shouting", "klas": "none", "conditions": ["-vocals"] },
          { "key": "short_horn", "klas": "none", "conditions": ["-wind_instrument"] },
          { "key": "long_horn", "klas": "none", "conditions": ["-wind_instrument"] },
          { "key": "panpipe", "klas": "none", "conditions": ["-wind_instrument"] },
          { "key": "reed", "klas": "none", "conditions": ["-wind_instrument", "-barren"] },
          { "key": "seashell_horn", "klas": "none", "conditions": ["-wind_instrument", "+coastal", "-cold"] },
          { "key": "flute", "klas": "none", "conditions": ["-wind_instrument"] },
          { "key": "plucked", "klas": "none", "conditions": ["-string_instrument"] },
          { "key": "strummed", "klas": "none", "conditions": ["-string_instrument"] },
          { "key": "perc_string", "klas": "none", "conditions": ["-string_instrument", "tech>-700"] },
          { "key": "bowed", "klas": "none", "conditions": ["-string_instrument", "tech>700"] },
          { "key": "saxophones", "klas": "none", "conditions": ["-wind_instrument", "tech>1840"] },
          { "key": "electronic", "klas": "none", "conditions": ["tech>1910"] },
          { "key": "synthesizer", "klas": "none", "conditions": ["tech>1970"] },
          { "key": "vocaloids", "klas": "none", "conditions": ["tech>2005"] }
        ]
      }
    ]
  },
  {
    "key": "sport", "chance": 0.3, "features": [
      {
        "key": "act", "newWord": false, "values": [
          { "key": "push", "klas": "push", "conditions": [] },
          { "key": "throw", "klas": "none", "conditions": [] },
          { "key": "roll", "klas": "roll", "conditions": [] },
          { "key": "carry", "klas": "carry", "conditions": [] },
          { "key": "hit", "klas": "hit", "conditions": [] },
          { "key": "kick", "klas": "kick", "conditions": [] }
        ]
      },
      {
        "key": "object", "newWord": false, "values": [
          { "key": "ball", "klas": "none", "conditions": ["-push"] },
          { "key": "rock", "klas": "none", "conditions": ["-hit", "-kick"] },
          { "key": "sack", "klas": "none", "conditions": ["-push", "-roll"] },
          { "key": "disc", "klas": "none", "conditions": ["-push", "-hit", "-kick"] },
          { "key": "javelin", "klas": "none", "conditions": ["-push", "-roll", "-hit", "-kick"] },
          { "key": "pole", "klas": "none", "conditions": ["-hit", "-kick"] },
          { "key": "stick", "klas": "none", "conditions": ["-push", "-roll", "-hit", "-kick"] },
          { "key": "others", "klas": "pvp", "conditions": ["-roll", "-kick"] }
        ]
      },
      {
        "key": "goal", "newWord": false, "values": [
          { "key": "far", "klas": "none", "conditions": [] },
          { "key": "posts", "klas": "none", "conditions": [] },
          { "key": "net", "klas": "none", "conditions": [] },
          { "key": "hoop", "klas": "none", "conditions": ["-push", "-roll"] },
          { "key": "hole", "klas": "none", "conditions": ["-carry"] },
          { "key": "pole", "klas": "none", "conditions": ["-push", "-carry"] },
          { "key": "barrier", "klas": "none", "conditions": ["-push", "-carry", "-roll"] },
          { "key": "line", "klas": "none", "conditions": [] },
          { "key": "target", "klas": "none", "conditions": ["-push", "-carry"] },
          { "key": "players", "klas": "none", "conditions": ["-push", "-carry", "-pvp"] }
        ]
      },
      {
        "key": "condition", "newWord": true, "values": [
          { "key": "ground", "klas": "none", "conditions": ["-roll", "-push", "-pvp"] },
          { "key": "horse", "klas": "none", "conditions": [] },
          { "key": "elephant", "klas": "none", "conditions": ["-cold", "-barren"] },
          { "key": "fire", "klas": "none", "conditions": [] },
          { "key": "race", "klas": "none", "conditions": [] },
          { "key": "time", "klas": "none", "conditions": ["tech>-1500"] },
          { "key": "rhythm", "klas": "none", "conditions": [] },
          { "key": "bat", "klas": "none", "conditions": ["+hit"] },
          { "key": "racket", "klas": "none", "conditions": ["+hit"] },
          { "key": "lacrosse", "klas": "none", "conditions": ["-push"] },
          { "key": "hip", "klas": "none", "conditions": ["+hit"] },
          { "key": "salmon", "klas": "none", "conditions": [] },
          { "key": "judge", "klas": "none", "conditions": [] },
          { "key": "telekinesis", "klas": "none", "conditions": [] },
          { "key": "broomstick", "klas": "none", "conditions": [] },
          { "key": "spoon", "klas": "none", "conditions": [] },
          { "key": "skating", "klas": "none", "conditions": ["+cold", "-dry"] },
          { "key": "swimming", "klas": "none", "conditions": ["+coastal", "-cold", "-dry", "-roll"] },
          { "key": "phone", "klas": "none", "conditions": ["tech>2000"] }
        ]
      }
    ]
  },
  {
    "key": "custom", "chance": 0.3, "features": [
      {
        "key": "event", "newWord": false, "values": [
          { "key": "coronation", "klas": "none", "conditions": [] },
          { "key": "spring", "klas": "none", "conditions": ["+four_seasons"] },
          { "key": "summer", "klas": "none", "conditions": ["+four_seasons"] },
          { "key": "autumn", "klas": "none", "conditions": ["+four_seasons"] },
          { "key": "winter", "klas": "none", "conditions": ["+four_seasons"] },
          { "key": "year", "klas": "none", "conditions": ["+four_seasons"] },
          { "key": "bounty", "klas": "none", "conditions": [] },
          { "key": "eclipse", "klas": "none", "conditions": [] },
          { "key": "birthday", "klas": "none", "conditions": [] },
          { "key": "politician", "klas": "none", "conditions": [] },
          { "key": "victory", "klas": "none", "conditions": [] },
          { "key": "sports", "klas": "sports", "conditions": [] },
          { "key": "guests", "klas": "none", "conditions": [] },
          { "key": "gods", "klas": "none", "conditions": [] },
          { "key": "dead", "klas": "none", "conditions": [] },
          { "key": "full_moon", "klas": "none", "conditions": [] },
          { "key": "new_moon", "klas": "none", "conditions": [] },
          { "key": "marriage", "klas": "none", "conditions": [] },
          { "key": "independence", "klas": "none", "conditions": ["+nation_state"] }
        ]
      },
      {
        "key": "act", "newWord": false, "values": [
          { "key": "drinking", "klas": "none", "conditions": [] },
          { "key": "feast", "klas": "none", "conditions": [] },
          { "key": "animals", "klas": "none", "conditions": [] },
          { "key": "humans", "klas": "none", "conditions": [] },
          { "key": "sweets", "klas": "none", "conditions": [] },
          { "key": "bitters", "klas": "none", "conditions": [] },
          { "key": "pastries", "klas": "none", "conditions": [] },
          { "key": "rocks", "klas": "none", "conditions": [] },
          { "key": "dances", "klas": "none", "conditions": [] },
          { "key": "screaming", "klas": "none", "conditions": [] },
          { "key": "tournament", "klas": "none", "conditions": ["-sports"] },
          { "key": "fireworks", "klas": "none", "conditions": ["tech>1110"] },
          { "key": "bells", "klas": "none", "conditions": ["tech>-2000"] },
          { "key": "drums", "klas": "none", "conditions": [] },
          { "key": "gifts", "klas": "none", "conditions": [] },
          { "key": "party", "klas": "none", "conditions": [] },
          { "key": "acid", "klas": "none", "conditions": [] },
          { "key": "clothes", "klas": "none", "conditions": [] },
          { "key": "grass", "klas": "none", "conditions": ["+plains"] },
          { "key": "prayer", "klas": "none", "conditions": [] }
        ]
      },
      {
        "key": "custom", "newWord": false, "values": [
          { "key": "duel", "klas": "none", "conditions": [] },
          { "key": "age", "klas": "none", "conditions": [] },
          { "key": "dating", "klas": "none", "conditions": [] },
          { "key": "shoes", "klas": "none", "conditions": [] },
          { "key": "funeral", "klas": "none", "conditions": [] },
          { "key": "military", "klas": "none", "conditions": [] },
          { "key": "dowry", "klas": "none", "conditions": [] },
          { "key": "bride_price", "klas": "none", "conditions": [] },
          { "key": "favors", "klas": "none", "conditions": [] },
          { "key": "literacy", "klas": "none", "conditions": ["tech>-1500"] },
          { "key": "omen", "klas": "none", "conditions": [] },
          { "key": "cats", "klas": "none", "conditions": [] },
          { "key": "name", "klas": "none", "conditions": [] },
          { "key": "siesta", "klas": "none", "conditions": [] },
          { "key": "meals", "klas": "none", "conditions": [] },
          { "key": "omiyage", "klas": "none", "conditions": [] },
          { "key": "guest", "klas": "none", "conditions": [] },
          { "key": "bow", "klas": "none", "conditions": [] },
          { "key": "handshake", "klas": "none", "conditions": [] },
          { "key": "hug", "klas": "none", "conditions": [] },
          { "key": "noses", "klas": "none", "conditions": [] },
          { "key": "kiss", "klas": "none", "conditions": [] },
          { "key": "try_the_floor", "klas": "none", "conditions": [] },
          { "key": "anticle", "klas": "none", "conditions": [] },
          { "key": "creche", "klas": "none", "conditions": [] },
          { "key": "adults", "klas": "none", "conditions": [] },
          { "key": "geophagy", "klas": "none", "conditions": ["-sandy"] },
          { "key": "eat_sand", "klas": "none", "conditions": ["+sandy"] },
          { "key": "weekday", "klas": "none", "conditions": ["-colored_clothes"] }
        ]
      }
    ]
  }
];
