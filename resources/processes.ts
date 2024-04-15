export default [
  {
    "chance": 0.200, "type": "mute", "comment": "advancing of unrounded vowels",
    "code": "[ +UNROUND +VELAR +VOWEL ] > [ +CENTRAL ] /"
  }, {
    "chance": 0.200, "type": "mute", "comment": "fronting of unrounded vowels",
    "code": "[ +UNROUND +VOWEL ] > [ +PALATAL ] /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "fronting of high vowels",
    "code": "[ +HIGH ] > [ +PALATAL ] /"
  }, {
    "chance": 0.200, "type": "mute", "comment": "backing of rounded vowels",
    "code": "[ +LABIAL +VOCOID ] > [ +VELAR ] /"
  }, {
    "chance": 0.500, "type": "mute", "comment": "fronting of central semivowels",
    "code": "[ +CENTRAL +UNROUND +GLIDE ] > [ +PALATAL ] /"
  }, {
    "chance": 0.500, "type": "mute", "comment": "backing of central semivowels",
    "code": "[ +CENTRAL +LABIALIZ +GLIDE ] > [ +VELAR ] /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "backing of central vowels",
    "code": "[ +CENTRAL ] > [ +VELAR ] /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "fronting of central vowels",
    "code": "[ +CENTRAL ] > [ +PALATAL ] /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "merge low vowels",
    "code": "[ +LOW ] > [ +PALATAL ] /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "merge low vowels",
    "code": "[ +LOW ] > [ +VELAR ] /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "unrounding of high vowels",
    "code": "[ +HIGH ] > [ +UNROUND ] /"
  }, {
    "chance": 0.200, "type": "mute", "comment": "unrounding of front vowels",
    "code": "[ +PALATAL +VOCOID ] > [ +UNROUND ] /"
  }, {
    "chance": 0.200, "type": "mute", "comment": "unrounding of low vowels",
    "code": "[ +LOW ] > [ +UNROUND ] /"
  }, {
    "chance": 0.200, "type": "mute", "comment": "rounding of back vowels",
    "code": "[ +VELAR +VOCOID ] > [ +LABIALIZ ] /"
  }, {
    "chance": 0.500, "type": "mute", "comment": "correction of nonhigh semivowels",
    "code": "[ +GLIDE ] > [ +CLOSE ] /"
  }, {
    "chance": 0.500, "type": "mute", "comment": "correction of nonhigh semivowels",
    "code": "[ +GLIDE -HIGH ] > [ +UNSTRESS ] /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "",
    "code": "[ +GLIDE ] > [ +UNSTRESS ] / [ +LIQ ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "ɛ > æ",
    "code": "[ +OPEN_MID ] > [ +NEAR_OPEN ] /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "æ > ɛ",
    "code": "[ +NEAR_OPEN ] > [ +OPEN_MID ] /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "i > e",
    "code": "[ +HIGH ] > [ +LOWERED ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "ɪ > e",
    "code": "[ +NEAR_CLOSE ] > [ +CLOSE_MID ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "aboot rice",
    "code": "[ +LOW ] > [ +OPEN_MID ] / _ [ +GLIDE ] [ +SORD ]"
  }, {
    "chance": 0.020, "type": "mute", "comment": "ew > ju",
    "code": "[ +PALATAL +MID +VOWEL ] [ +LABIAL +GLIDE ] > [ +HIGH +NONSYLLAB ]0 [ +HIGH ±loke ±minorLoke ]0 /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "ew > oj",
    "code": "[ +PALATAL +MID +VOWEL ] [ +LABIAL +GLIDE ] > [ +VELAR ]0 [ +PALATAL ]1 /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "ew > aw",
    "code": "[ +PALATAL +MID +VOWEL ] > [ +LOW ] / _ [ +LABIAL +GLIDE ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "french i > a",
    "code": "[ +SHORT +UNSTRESS +PALATAL +VOCOID ] > [ +LOW ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "er > ar",
    "code": "[ +VOWEL ] > [ +LOWERED ] / _ [ +RHOTIC ]"
  }, {
    "chance": 0.005, "type": "mute", "comment": "3-vowel system",
    "code": "[ +MID ] > [ +HIGH ] /"
  }, {
    "chance": 0.200, "type": "mute", "comment": "ç > ʃ",
    "code": "[ +!PALATAL +OBSTR ] > [ +POSTALV ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "ɟ > j",
    "code": "[ +!PALATAL +OBSTR ] > [ +CLOSE ] /"
  }, {
    "chance": 0.200, "type": "mute", "comment": "",
    "code": "[ +BILAB +CONT ] > [ +LABIODENT ] /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "θ > f",
    "code": "[ +DENTAL +FRIC ] > [ +LABIODENT ] /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "θ > s",
    "code": "[ +DENTAL +OBSTR ] > [ +ALVEO ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "x > f",
    "code": "[ +VELAR +FRIC ] > [ +LABIODENT ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "f > h",
    "code": "[ +LABIAL -VOICE +FRIC ] > [ +GLOT ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "f > h",
    "code": "[ +LABIAL -VOICE +FRIC ] > [ +GLOT ] / _ [ -LABIAL ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "s > h in coda",
    "code": "[ +SIBILANT +FRIC ] > [ +GLOT ] / _ [ -VOCOID ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "s > h word-inicially",
    "code": "[ +SIBILANT +FRIC ] > [ +GLOT ] / # _"
  }, {
    "chance": 0.002, "type": "mute", "comment": "s > h in onset",
    "code": "[ +SIBILANT +FRIC ] > [ +GLOT ] / _ [ +VOCOID ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "ʃ > x",
    "code": "[ +POSTALV +FRIC -VOICE ] > [ +VELAR ] /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "x > h",
    "code": "[ +DORSAL +FRIC ] > [ +GLOT ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "ħ > h",
    "code": "[ +GUTT +FRIC ] > [ +GLOT ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "kt > pt",
    "code": "[ +DORSAL -VOCOID ] > [ +BILABIAL ] / _ [ +CORONAL ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "pt > kt",
    "code": "[ +LABIAL -VOCOID ] > [ +VELAR ] / _ [ +CORONAL ]"
  }, {
    "chance": 0.005, "type": "mute", "comment": "p > t in coda",
    "code": "[ +LABIAL +STOP ] > [ +ALVEO ] / _ [ -VOCOID ]"
  }, {
    "chance": 0.005, "type": "mute", "comment": "t > k in coda",
    "code": "[ +CORON +STOP ] > [ +VELAR ] / _ [ -VOCOID ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "t > k",
    "code": "[ +CORON +STOP ] > [ +VELAR ] /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "k > ʔ",
    "code": "[ +VELAR +STOP ] > [ +GLOT ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "ʃ > s",
    "code": "[ +POSTALV ] > [ +ALVEO ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "ʃ > ʂ",
    "code": "[ +PALATAL -LOW -MID ] > [ +RETRO ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "ʒ > ʂ",
    "code": "[ +VOICE +POSTALV ] > [ +TENUIS +RETRO ] /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "ʃ > ɬ",
    "code": "[ +POSTALV ] > [ +LATERAL ] /"
  }, {
    "chance": 0.005, "type": "mute", "comment": "ɬ > ʃ",
    "code": "[ +LATERAL +OBSTR ] > [ +MEDIAN +POSTALV ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "ɻ > ɨ",
    "code": "[ +SYLLAB +CLOSE +MEDIAN -VOWEL ] > [ +CENTRAL ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "χ > ħ",
    "code": "[ +UVULAR ] > [ +PHARYNG ] /"
  }, {
    "chance": 0.005, "type": "mute", "comment": "ɡ > h",
    "code": "[ +VOICE +VELAR +STOP ] > [ +GLOT +FRIC ] /"
  }, {
    "chance": 0.005, "type": "mute", "comment": "ɡ > ɟ",
    "code": "[ +VOICE +DORSAL +STOP ] > [ +PALATAL ] /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "ft > st",
    "code": "[ +FRIC ] > [ +ALVEO ] / [ -SYLLAB ] _ [ -SYLLAB -LIQ ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "st > ʃt",
    "code": "[ +SIBIL ] > [ +POSTALV ] / _ [ +STOP ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "retraction before back vowels",
    "code": "[ +VELAR ] > [ +UVULAR ] / _ [ +VELAR +VOCOID ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "linguolabials",
    "code": "[ +LABIAL -VOCOID ] > [ +LINGUOLAB ] /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "",
    "code": "[ +CORON -VOCOID ] > [ +LINGUOLAB ] / [ +LABIAL ] _"
  }, {
    "chance": 0.050, "type": "mute", "comment": "",
    "code": "[ +LINGUOLAB ] > [ +DENTAL ] /"
  }, {
    "chance": 0.005, "type": "mute", "comment": "gemination > palatalization",
    "code": "[ +LONG +CORON +SONOR ] > [ +SHORT +PALATAL ] /"
  }, {
    "chance": 0.005, "type": "mute", "comment": "create the Japanese ɴ",
    "code": "[ +NASAL ] > [ +UVULAR ] / _ [ -STOP -AFFR -VOCOID ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "merge ŋ and m in coda",
    "code": "[ -CORON +NONSYLLAB ] > [ +VELAR ] / _ [ -VOCOID ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "merge n and m in coda",
    "code": "[ -DORSAL +NONSYLLAB ] > [ +DENTAL ] / _ [ -VOCOID ]"
  }, {
    "chance": 0.005, "type": "mute", "comment": "merge m and n in coda",
    "code": "[ -DORSAL +NASAL ] > [ +BILAB ] / _ [ -VOCOID ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "",
    "code": "[ +SYLLAB +NASAL ] > [ +BILAB ] /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "delete all fricatives",
    "code": "[ +FRIC ] > [ +GLOT ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "affricates to fricatives",
    "code": "[ +AFFR ] > [ +FRIC ] /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "ʒ > dʒ",
    "code": "[ +VOICE +SIBILANT ] > [ +AFFR ] /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "d͡ɮ > ɮ",
    "code": "[ +VOICE +LATERAL +AFFR ] > [ +FRIC ] /"
  }, {
    "chance": 0.200, "type": "mute", "comment": "dz > z",
    "code": "[ +VOICE +ALVEO +AFFR ] > [ +FRIC ] /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "dz > ts",
    "code": "[ +VOICE +ALVEO +AFFR ] > [ +TENUIS ] /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "ts > θ",
    "code": "[ +ALVEO +AFFR ] > [ +DENTAL +FRIC ] /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "ts > t",
    "code": "[ +AFFR ] > [ +STOP ] /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "fricate p specifically",
    "code": "[ +LABIAL -VOICE +STOP ] > [ +TENUIS +FRIC ] / [ -OCCL ] _"
  }, {
    "chance": 0.050, "type": "mute", "comment": "fricate p specifically",
    "code": "[ +LABIAL -VOICE +STOP ] > [ +TENUIS +FRIC ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "the thing only I do",
    "code": "[ +ASPIR +DENTAL +STOP ] > [ +ALVEO +AFFR ] /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "tu > tsu",
    "code": "[ +DENTAL +STOP ] > [ +ALVEO +AFFR ] / _ [ +HIGH +VELAR ]"
  }, {
    "chance": 0.050, "type": "mute", "comment": "ʎ > l",
    "code": "[ +LATERAL ] > [ +ALVEO ] /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "ʎ > j",
    "code": "[ +LATERAL -CORON ] > [ +MEDIAN ] /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "n > l",
    "code": "[ +CORON +NASAL ] > [ +LATERAL +CLOSE ] /"
  }, {
    "chance": 0.005, "type": "mute", "comment": "ɳ > ʝ",
    "code": "[ +PALATAL +NASAL ] > [ +FRIC ] /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "ɳ > ŋ",
    "code": "[ +PALATAL +NASAL ] > [ +VELAR ] /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "l > n",
    "code": "[ +LATERAL +CLOSE ] > [ +MEDIAN +NASAL ] /"
  }, {
    "chance": 0.005, "type": "mute", "comment": "d > l",
    "code": "[ +VOICE +CORON +STOP ] > [ +LATERAL +CLOSE ] / _ [ -VOCOID ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "l > d",
    "code": "[ +LATERAL +CLOSE ] > [ +MEDIAN +STOP ] / _ [ +HIGH ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "r > l",
    "code": "[ +VIBR ] > [ +LATERAL +CLOSE ] / [ -ALVEO +OCCL ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "r > l",
    "code": "[ +VIBR ] > [ +LATERAL +CLOSE ] / _ [ -LABIAL +CLOSE ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "l > ɾ",
    "code": "[ +SHORT +LATERAL +CLOSE ] > [ +MEDIAN +TAP ] / [ +VOCOID ] _ [ +VOCOID ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "l > ɾ",
    "code": "[ +LATERAL +CLOSE ] > [ +MEDIAN +TAP ] /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "z > ɹ",
    "code": "[ +VOICE +CORON +FRIC ] > [ +CLOSE ] /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "ŋ > ɡ",
    "code": "[ +DORSAL +NASAL ] > [ +STOP ] / _ [ +VOCOID ]"
  }, {
    "chance": 0.100, "type": "mute", "comment": "ŋ > ɰ",
    "code": "[ +DORSAL +NASAL ] > [ +CLOSE ] / _ [ +VOCOID ]"
  }, {
    "chance": 0.005, "type": "mute", "comment": "ɡ > ŋ",
    "code": "[ +VOICE +DORSAL +STOP ] > [ +NASAL ] /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "θ > t",
    "code": "[ +DENTAL +OBSTR ] > [ +STOP ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "ʔ > ŋ",
    "code": "[ +GLOT -FRIC ] > [ +VELAR +NASAL ] /"
  }, {
    "chance": 0.005, "type": "mute", "comment": "ʔ > ɣ",
    "code": "[ +GLOT ] > [ +VOICE +VELAR +FRIC ] /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "",
    "code": "[ +RHOTIC ] > [ +LATERAL +CLOSE ] /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "",
    "code": "[ +RHOTIC ] > [ +ALVEO +TAP ] /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "",
    "code": "[ +RHOTIC ] > [ +ALVEO +TRILL ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "",
    "code": "[ +RHOTIC ] > [ +UVULAR +TRILL ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "",
    "code": "[ +RHOTIC ] > [ +RETRO +CLOSE ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "r-fortition",
    "code": "[ +RHOTIC ] > [ +STOP ] / _ [ -CONT ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "pr > pl",
    "code": "[ +RHOTIC ] > [ +LATERAL +CLOSE ] / [ +SPOKEN -VOCOID ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "trills are hard",
    "code": "[ +UVULAR +TRILL ] > [ +FRIC ] /"
  }, {
    "chance": 0.005, "type": "mute", "comment": "trills are hard",
    "code": "[ +ALVEO +TRILL ] > [ +CLOSE ] /"
  }, {
    "chance": 0.005, "type": "mute", "comment": "trills are hard",
    "code": "[ +ALVEO +TRILL ] > [ +RETRO +CLOSE ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "trills are hard at the starts of words",
    "code": "[ +ALVEO +TRILL ] > [ +RETRO +CLOSE ] / # _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "trills are hard at the ends of words",
    "code": "[ +ALVEO +TRILL ] > [ +RETRO +CLOSE ] / _ #"
  }, {
    "chance": 0.200, "type": "mute", "comment": "taps geminate to trills",
    "code": "[ +LONG +TAP ] > [ +SHORT +TRILL ] /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "w > ʋ",
    "code": "[ +LABIAL +NONSYLLAB +CLOSE ] > [ +LABIODENT ] /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "w > ⱱ",
    "code": "[ +LABIAL +NONSYLLAB +CLOSE ] > [ +LABIODENT +TAP ] /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "v > w",
    "code": "[ +LABIAL +CONT +NONSYLLAB ] > w / [ -VOCOID ] _ [ +VOCOID ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "frication of approximants",
    "code": "[ +UNROUND -LATERAL +CLOSE +NONSYLLAB ] > [ +FRIC ] /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "ɻ > ʐ",
    "code": "[ +RETRO -LATERAL +CLOSE +NONSYLLAB ] > [ +FRIC ] /"
  }, {
    "chance": 0.005, "type": "mute", "comment": "k > j in coda",
    "code": "[ +DORSAL +STOP ] > [ +PALATAL +CLOSE ] / [ +VOWEL ] _ [ -VOCOID ]"
  }, {
    "chance": 0.100, "type": "mute", "comment": "frication of ʋ",
    "code": "[ +LABIODENT +SONOR ] > [ +FRIC ] / [ -NONSYLLAB ] _"
  }, {
    "chance": 0.020, "type": "mute", "comment": "frication of j",
    "code": "[ +!PALATAL +GLIDE ] > [ +FRIC ] / [ -NONSYLLAB ] _ [ +VOWEL ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "",
    "code": "[ +VOICE +OCCL ] > [ +NASAL ] /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "prenasalized stops I",
    "code": "[ +VOICE +OBSTR ] > [ +NASALIZ ] /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "prenasalized stops II",
    "code": "[ +!NASAL ] > [ +NASALIZ +STOP ] / _ [ +HIGH ]"
  }, {
    "chance": 0.100, "type": "mute", "comment": "",
    "code": "[ +!NASAL ] > [ +STOP ] / _ [ +LIQ ]"
  }, {
    "chance": 0.200, "type": "mute", "comment": "",
    "code": "[ +PHARYNG +STOP ] > [ +FRIC ] /"
  }, {
    "chance": 0.200, "type": "mute", "comment": "",
    "code": "[ +VOICE +PHARYNG +FRIC ] > [ +CLOSE ] /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "make h the only glottal consonant",
    "code": "[ +GLOT ] > [ +FRIC ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "mn > mr",
    "code": "[ -LIQ +CORON +OCCL ] > [ +TAP ] / [ +SPOKEN -VOCOID -CORON ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "click genesis",
    "code": "[ +NONSYLLAB ] [ +NONSYLLAB -GUTTURAL ] > [ +CLICK ]1 /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "click genesis",
    "code": "[ +OCCL ] [ +CORON ] > [ +CLICK ]1 /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "dm > nm",
    "code": "[ +VOICE +OCCL ] > [ +NASAL ] / _ [ +OCCL ]"
  }, {
    "chance": 0.005, "type": "mute", "comment": "tm > tp",
    "code": "[ +!NASAL ] > [ +STOP ] / [ +STOP ] _"
  }, {
    "chance": 0.002, "type": "mute", "comment": "nasal vowels become nasal consonants",
    "code": "[ +NASAL ] > [ +NASAL ] /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "loss of all nasal consonants",
    "code": "[ +!NASAL ] > [ +STOP ] /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "ʙʙʙʙʙʙ",
    "code": "[ +VOICE +BILAB +STOP ] > [ +NASALIZ +TRILL ] / _ [ +VELAR +VOCOID ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "ʙʙʙʙʙʙ",
    "code": "[ +LABIAL +VOWEL ] > [ +BILAB +TRILL ] / [ +STOP ] _"
  }, {
    "chance": 0.050, "type": "mute", "comment": "vowel reduction",
    "code": "[ +UNSTRESS +VOWEL ] > [ +MID ] /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "vowel reduction",
    "code": "[ +UNSTRESS +VOWEL ] > [ +CENTRAL ] /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "falling diphthong reduction",
    "code": "[ +SHORT +GLIDE ] > / [ +SPOKEN -VOCOID ] _ [ +UNSTRESS ]"
  }, {
    "chance": 0.020, "type": "mute", "comment": "rising diphthong reduction",
    "code": "[ +GLIDE ] > / [ +UNSTRESS ] _"
  }, {
    "chance": 0.020, "type": "mute", "comment": "length-based laxing",
    "code": "[ +SHORT +UNSTRESS +VOWEL ] > [ +LAX ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "no ending in high vowels",
    "code": "[ +UNSTRESS +VOWEL ] > [ +LOWER ] / _ #"
  }, {
    "chance": 0.002, "type": "mute", "comment": "stress-based unrounding",
    "code": "[ +UNSTRESS ] > [ +UNROUND ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "weird ɛ~ɪ thing from Haw and Rus",
    "code": "[ +UNSTRESS +!PALATAL -HIGH +VOWEL ] > [ +RAISED +LAX ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "-ʊ > -o",
    "code": "[ +LAX +VOWEL ] > [ +LOWERED +TENSE ] / _ [ -NONSYLLAB ]"
  }, {
    "chance": 0.100, "type": "mute", "comment": "loss of gemination",
    "code": "[ +NONSYLLAB ] > [ +SHORT ] /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "loss of vowel length",
    "code": "[ +VOCOID ] > [ +SHORT ] /"
  }, {
    "chance": 0.500, "type": "mute", "comment": "geminates should follow vocoids",
    "code": "[ +NONSYLLAB ] > [ +SHORT ] / [ -VOCOID ] _"
  }, {
    "chance": 0.200, "type": "mute", "comment": "denasalization on nonvowels",
    "code": "[ +NASALIZ -VOWEL ] > [ +ORAL ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "t flapping (between vowels)",
    "code": "[ -ASPIR -PHARYNGEALIZ +SHORT +ALVEO +STOP ] > [ +VOICE +TAP ] / [ +VOCOID ] _ [ +VOWEL ]"
  }, {
    "chance": 0.005, "type": "mute", "comment": "t flapping (at word end)",
    "code": "[ -ASPIR -PHARYNGEALIZ +SHORT +ALVEO +STOP ] > [ +VOICE +TAP ] / _ #"
  }, {
    "chance": 0.010, "type": "mute", "comment": "t lateralizacion",
    "code": "[ +ALVEO +STOP ] > [ +VOICE +LATERAL +CLOSE ] / [ +STOP ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "t glottalizacion",
    "code": "[ +TENUIS -PHARYNGEALIZ +SHORT +ALVEO +STOP ] > [ +GLOT ] / [ +PRIMARY ] _ [ -LIQ ]"
  }, {
    "chance": 0.050, "type": "mute", "comment": "kl > kj",
    "code": "[ +LATERAL +CLOSE ] > [ +MEDIAN +PALATAL ] / [ +VELAR +STOP ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "tl > tj",
    "code": "[ +LATERAL +CLOSE ] > [ +MEDIAN +PALATAL ] / [ +STOP ] _"
  }, {
    "chance": 0.100, "type": "mute", "comment": "t͡ʃl > ʃl",
    "code": "[ +AFFR ] > [ +FRIC ] / _ [ +LIQ ]"
  }, {
    "chance": 0.005, "type": "mute", "comment": "lu > ɻu",
    "code": "[ +LATERAL +CORON ] > [ +RETRO +MEDIAN ] / _ [ -PALATAL ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "t > s",
    "code": "[ +DENTAL +STOP -PHARYNGEALIZ ] > [ +ALVEO +FRIC ] / _ [ -CONT ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "stop to fricative",
    "code": "[ -TENUIS +STOP -PHARYNGEALIZ ] > [ +FRIC ] / [ +CONT ] _"
  }, {
    "chance": 0.002, "type": "mute", "comment": "stop to fricative",
    "code": "[ +STOP -PHARYNGEALIZ ] > [ +FRIC ] / _ [ -VOCOID ]"
  }, {
    "chance": 0.005, "type": "mute", "comment": "fricative to approx",
    "code": "[ +VOICE +FRIC -PHARYNGEALIZ ] > [ +CLOSE ] /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "fricative to tenuis",
    "code": "[ +FRIC ] > [ +TENUIS ] /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "if it looks vocal, it vocal",
    "code": "[ +DORSAL +LABIALIZ +FRIC ] > [ +CLOSE ] /"
  }, {
    "chance": 0.005, "type": "mute", "comment": "aspirated to tenuis",
    "code": "[ +ASPIR +OBSTR ] > [ +TENUIS ] /"
  }, {
    "chance": 0.500, "type": "mute", "comment": "aspirated to tenuis",
    "code": "[ +ASPIR +FRIC ] > [ +TENUIS ] /"
  }, {
    "chance": 0.005, "type": "mute", "comment": "voiced to tenuis",
    "code": "[ +VOICE +OBSTR ] > [ +TENUIS ] /"
  }, {
    "chance": 0.500, "type": "mute", "comment": "voiced to tenuis, specifically ɢ",
    "code": "[ +VOICE +UVULAR +STOP ] > [ +TENUIS ] /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "voiced to tenuis, even sonorants",
    "code": "[ +VOICE ] > [ +TENUIS ] / [ +ASPIR ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "voiced to fric, specifically ɡ",
    "code": "[ +VOICE +DORSAL +STOP ] > [ +FRIC ] /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "voiced to breathy",
    "code": "[ +VOICE +OBSTR ] > [ +BREATHY ] /"
  }, {
    "chance": 0.005, "type": "mute", "comment": "voiced to aspirated",
    "code": "[ +VOICE +OBSTR ] > [ +ASPIR ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "breathy to aspirated",
    "code": "[ +BREATHY +OBSTR +OCCL ] > [ +ASPIR ] /"
  }, {
    "chance": 0.200, "type": "mute", "comment": "breathy to tenuis",
    "code": "[ +BREATHY +FRIC ] > [ +TENUIS ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "breathy to tenuis",
    "code": "[ +BREATHY ] > [ +TENUIS ] /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "coda devoicing",
    "code": "[ +OBSTR ] > [ +TENUIS ] / _ [ -VOICE ]"
  }, {
    "chance": 0.050, "type": "mute", "comment": "get rid of voiceless sonorants",
    "code": "[ -VOICE +SONOR ] > [ +FRIC ] /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "get rid of voiceless sonorants",
    "code": "[ -VOICE +SONOR ] > [ +VOICE ] /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "get rid of voiceless sonorants",
    "code": "[ -VOICE +SONOR ] > [ +TENUIS +GLOT +FRIC ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "r-dropping",
    "code": "[ -SYLLAB +RHOTIC ] > ə̯ / _ [ -VOWEL ]"
  }, {
    "chance": 0.020, "type": "mute", "comment": "",
    "code": "[ +LABIALIZ -VOCOID ] > [ +UNROUND ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "",
    "code": "[ +LABIALIZ -VOCOID ] > [ +BILAB ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "qu > cu",
    "code": "[ +LABIALIZ -VOCOID ] > [ +UNROUND ] w / _ [ -LABIAL ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "qu > uc",
    "code": "[ +LABIALIZ -VOCOID ] > w [ +UNROUND ] / [ -LABIAL ] _"
  }, {
    "chance": 0.050, "type": "mute", "comment": "",
    "code": "[ +PALATALIZ ] > [ +UNROUND ] /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "",
    "code": "[ +PALATALIZ ] > [ +PALATAL ] /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "",
    "code": "[ +PALATALIZ ] > [ +UNROUND ] j / _ [ -PALATAL ]"
  }, {
    "chance": 0.020, "type": "mute", "comment": "",
    "code": "[ +PALATALIZ ] > j [ +UNROUND ] / [ -PALATAL ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "form Czech trill-fricative",
    "code": "[ +PALATALIZ +TRILL ] > [ +BREATHY +UNROUND +TRILL ] /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "break up Czech trill-fricative",
    "code": "[ +BREATHY +TRILL ] > [ +VOICE +CLOSE ] [ +VOICE +FRIC ] /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "soften Czech trill-fricative",
    "code": "[ +BREATHY +CORON +TRILL ] > [ +VOICE +POSTALV +FRIC ] /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "",
    "code": "[ +VELARIZ ] > [ +UNROUND ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "",
    "code": "[ +VELARIZ ] > [ +VELAR ] /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "dark l > w",
    "code": "[ +VELARIZ +CLOSE ] > [ +MEDIAN +VELAR +UNROUND ] /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "dark l > ðˠ",
    "code": "[ +VELARIZ +CORON +CLOSE ] > [ +MEDIAN +FRIC ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "dark l > lw",
    "code": "[ +VELARIZ ] > [ +UNROUND ] ɰ / _ [ -VELAR ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "dark l > wl",
    "code": "[ +VELARIZ ] > ɰ [ +UNROUND ] / [ -VELAR ] _"
  }, {
    "chance": 0.050, "type": "mute", "comment": "",
    "code": "[ +PHARYNGEALIZ ] > [ +UNROUND ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "",
    "code": "[ +PHARYNGEALIZ ] > [ +UNROUND +BREATHY ] /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "",
    "code": "[ +NASALIZ ] > [ +UNROUND ] /"
  }, {
    "chance": 0.005, "type": "mute", "comment": "loss of double-articulated tp",
    "code": "[ +LABIOCORON ] > [ +ALVEO ] [ +BILAB ] /"
  }, {
    "chance": 0.005, "type": "mute", "comment": "loss of double-articulated kp",
    "code": "[ +LABIOVELAR ] > [ +VELAR ] [ +BILAB ] /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "d > n in coda",
    "code": "[ +VOICE +STOP ] > [ +NASAL ] / _ [ -VOCOID -LIQ ]"
  }, {
    "chance": 0.200, "type": "mute", "comment": "",
    "code": "[ +VOCOID ] > [ +TENSE ] /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "lengthen single-letter words",
    "code": "[ ] > [ +LONG ] / # _ #"
  }, {
    "chance": 0.500, "type": "mute", "comment": "length-based tensing",
    "code": "[ +LONG +VOWEL ] > [ +TENSE ] /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "",
    "code": "[ +STRESS +VOWEL ] > [ +TENSE ] /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "Anglic vowel shift",
    "code": "[ +LONG +VOWEL ] > [ +RAISED ] / _ [ -GLIDE ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "raise stressd final vowels",
    "code": "[ +STRESS +VOWEL ] > [ +RAISED ] / _ #"
  }, {
    "chance": 0.010, "type": "mute", "comment": "",
    "code": "[ +CLOSE +VOWEL ] > [ +LONG ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "tenuis to aspirated",
    "code": "[ +OBSTR +OCCL -VOICE ] > [ +ASPIR ] / _ [ +STRESS ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "tenuis to aspirated",
    "code": "[ +TENUIS +OCCL ] > [ +ASPIR ] / # _"
  }, {
    "chance": 0.002, "type": "mute", "comment": "tenuis to ejective",
    "code": "[ +TENUIS +OCCL ] > [ +EJECT ] / _ [ -CONT ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "aspirated to ejective",
    "code": "[ +ASPIR ] > [ +EJECT ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "tenuis to voiced",
    "code": "[ +OBSTR -ASPIR +SHORT ] > [ +VOICE ] / [ +VOICE ] _ [ +VOICE ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "tenuis to voiced",
    "code": "[ +TENUIS ] > [ +VOICE ] / # _"
  }, {
    "chance": 0.002, "type": "mute", "comment": "tenuis to voiced",
    "code": "[ +TENUIS ] > [ +VOICE ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "voiced to stop",
    "code": "[ +VOICE +FRIC ] > [ +STOP ] /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "s > z",
    "code": "[ +SIBILANT +FRIC ] > [ +VOICE ] / [ -SORD ] _ [ +VOICE ]"
  }, {
    "chance": 0.020, "type": "mute", "comment": "s > z",
    "code": "[ +SIBILANT +FRIC ] > [ +VOICE ] / [ +VOICE ] _ [ -SORD ]"
  }, {
    "chance": 0.005, "type": "mute", "comment": "devoice initial r",
    "code": "[ +TRILL ] > [ +TENUIS ] / # _"
  }, {
    "chance": 0.005, "type": "mute", "comment": "devoice long r",
    "code": "[ +LONG +TRILL ] > [ +TENUIS ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "diphthongize mid vowels I",
    "code": "[ +PRIMARY +MID ] > [ +NONSYLLAB +CLOSE +SHORT ]0 [ +LOW ]0 / [ -GLIDE ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "diphthongize mid vowels II",
    "code": "[ +PRIMARY +MID ] > [ +NONSYLLAB +CLOSE +SHORT ]0 [ ]0 / [ -GLIDE ] _"
  }, {
    "chance": 0.020, "type": "mute", "comment": "diphthongize mid vowels III",
    "code": "[ +LONG +MID +VOWEL ] > [ +SHORT ]0 [ +NONSYLLAB +CLOSE +SHORT ]0 /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "diphthongization I",
    "code": "[ +STRESS +VOWEL ] > [ ] [ +NONSYLLAB +CLOSE +SHORT ] / _ [ +VOWEL ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "diphthongization II",
    "code": "[ +VOWEL ] > [ ] [ +NONSYLLAB +CLOSE +SHORT ] / _ [ +VOWEL ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "drawl",
    "code": "[ +LAX +!PALATAL +VOWEL ] > [ +RAISED +TENSE ]0 ə̯ /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "",
    "code": "[ +CENTRAL +VOWEL ] > [ +VELAR ] /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "affricate to stop",
    "code": "[ +PHARYNGEALIZ +AFFR ] > [ +UNROUND +STOP ] /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "affricate pharangealizeds",
    "code": "[ +PHARYNGEALIZ +OBSTR ] > [ +UNROUND +AFFR ] /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "pharyngealization to length",
    "code": "[ +PHARYNGEALIZ ] > [ +UNROUND +LONG ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "offglide to nasal",
    "code": "[ +CLOSE +GLIDE ] > [ +NASAL ] / [ +VOCOID ] _ [ -VOWEL ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "w > ɡw",
    "code": "[ +VELAR +GLIDE ] > [ +UNROUND +STOP ] [ ] / [ -OBSTR ] _ [ +VOWEL ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "",
    "code": "[ +LONG +VOWEL ] > [ +NASALIZ ] /"
  }, {
    "chance": 0.005, "type": "mute", "comment": "create weerd affricates",
    "code": "[ +LONG +FRIC ] > [ +SHORT +AFFR ] /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "ns > nt͡s",
    "code": "[ +SIBIL ] > [ +AFFR ] / [ +CORON +OCCL ] _"
  }, {
    "chance": 0.020, "type": "mute", "comment": "ls > lt͡s",
    "code": "[ +SIBIL ] > [ +AFFR ] / [ +CORON +SONOR ] _"
  }, {
    "chance": 0.050, "type": "mute", "comment": "labiality assimilation I",
    "code": "[ +DORSAL -VOCOID ] > [ +BILABIAL ] / _ [ +LABIALIZ ]"
  }, {
    "chance": 0.020, "type": "mute", "comment": "labiality assimilation II",
    "code": "[ +DORSAL -VOCOID ] > [ +BILABIAL ] / _ [ +LABIAL ]"
  }, {
    "chance": 0.020, "type": "mute", "comment": "labiality assimilation III",
    "code": "[ +DORSAL -VOCOID ] > [ +BILABIAL ] / [ +LABIAL ] _"
  }, {
    "chance": 0.050, "type": "mute", "comment": "palatalization of tj",
    "code": "[ +ALVEO ] > [ +POSTALV ] / _ [ +PALATAL +NONSYLLAB ]"
  }, {
    "chance": 0.020, "type": "mute", "comment": "palatalization of ti",
    "code": "[ +ALVEO ] > [ +POSTALV ] / _ [ +PALATAL +HIGH ]"
  }, {
    "chance": 0.020, "type": "mute", "comment": "palatalization of t͡se",
    "code": "[ +ALVEO +OBSTR -STOP ] > [ +POSTALV ] / _ [ +PALATAL ]"
  }, {
    "chance": 0.050, "type": "mute", "comment": "palatalization of ke",
    "code": "[ +DORSAL ] > [ +PALATAL ] / _ [ +PALATAL ]"
  }, {
    "chance": 0.020, "type": "mute", "comment": "palatalization of ek",
    "code": "[ +DORSAL ] > [ +PALATAL ] / [ +PALATAL ] _"
  }, {
    "chance": 0.020, "type": "mute", "comment": "rounding before labials",
    "code": "[ +VOWEL ] > [ +LABIALIZ ] / _ [ +LABIAL ]"
  }, {
    "chance": 0.020, "type": "mute", "comment": "rounding after labials",
    "code": "[ +VOWEL ] > [ +LABIALIZ ] / [ +LABIAL ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "fronting after palatals",
    "code": "[ +VOWEL ] > [ +PALATAL ] / [ +PALATAL ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "fronting before palatals",
    "code": "[ +VOWEL ] > [ +PALATAL ] / _ [ +PALATAL ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "rhoticization after nonpalatal",
    "code": "[ +PALATAL +HIGH ] > [ +RETRO ] / [ -PALATAL -VELAR +NONSYLLAB ] _"
  }, {
    "chance": 0.050, "type": "mute", "comment": "rhoticization after retroflex",
    "code": "[ +PALATAL +HIGH ] > [ +RETRO ] / [ +RETRO ] _"
  }, {
    "chance": 0.050, "type": "mute", "comment": "centralizacion before retroflex",
    "code": "[ +PALATAL +VOWEL ] > [ +CENTRAL ] / _ [ +RETRO ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "retraction after velars",
    "code": "[ +VOWEL ] > [ +VELAR ] / [ +VELAR ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "retraction before velars",
    "code": "[ +VOWEL ] > [ +VELAR ] / _ [ +VELAR ]"
  }, {
    "chance": 0.050, "type": "mute", "comment": "retraction after uvulars",
    "code": "[ +VOWEL ] > [ +VELAR ] / [ +UVULAR ] _"
  }, {
    "chance": 0.050, "type": "mute", "comment": "retraction before uvulars",
    "code": "[ +VOWEL ] > [ +VELAR ] / _ [ +UVULAR ]"
  }, {
    "chance": 0.050, "type": "mute", "comment": "advancement after pharangeals",
    "code": "[ +VOWEL ] > [ +LOWERED +PALATAL ] / [ +PHARYNG ] _"
  }, {
    "chance": 0.050, "type": "mute", "comment": "advancement before pharangeals",
    "code": "[ +VOWEL ] > [ +LOWERED +PALATAL ] / _ [ +PHARYNG ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "some minor vowel harmony",
    "code": "[ +UNSTRESS +VOWEL ] > [ +LABIALIZ ] / _ [ +NONSYLLAB ] [ +LABIALIZ +VOWEL ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "some minor vowel harmony",
    "code": "[ +UNSTRESS +VOWEL ] > [ +PALATAL ] / _ [ +NONSYLLAB ] [ +PALATAL +VOWEL ]"
  }, {
    "chance": 0.500, "type": "mute", "comment": "np > mp",
    "code": "[ +!NASAL ] > [ ±loke ] / _ [ +OBSTR ]"
  }, {
    "chance": 0.100, "type": "mute", "comment": "sɹ > ʃɹ",
    "code": "[ +CORON +OBSTR ] > [ +POSTALV ] / _ [ +CORONAL +CLOSE ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "rs > rʂ",
    "code": "[ +SIBILANT ] > [ +RETRO ] / [ +RHOTIC ] _"
  }, {
    "chance": 0.005, "type": "mute", "comment": "si > sɻ",
    "code": "[ +UNROUND +HIGH ] > [ +RETRO +CLOSE ] / [ +SIBIL -POSTALV ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "ht > θt",
    "code": "[ +GLOT +FRIC ] > [ ±loke ] / _ [ +STOP ]"
  }, {
    "chance": 0.100, "type": "mute", "comment": "lɻ > ɭɻ",
    "code": "[ +CORON ] > [ +RETRO ] / _ [ +RETRO ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "nasals voice stops",
    "code": "[ +TENUIS +OBSTR +OCCL ] > [ +VOICE ] / [ +VOICE +NASAL ] _"
  }, {
    "chance": 0.100, "type": "mute", "comment": "voicing assimilation",
    "code": "[ +OBSTR ] > [ ±voze ] / _ [ +OBSTR ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "vowel devoicing",
    "code": "[ -LOW -MID +SHORT ] > [ +TENUIS ] / [ -VOICE +SPOKEN ] _ [ -VOICE ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "wa > wo",
    "code": "[ +LOW +VOWEL ] > [ +LABIALIZ ] / [ +LABIAL +GLIDE ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "ja > je",
    "code": "[ +LOW +VOWEL ] > [ +RAISED ] / [ +HIGH ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "ɛj > ej",
    "code": "[ +VOWEL ] > [ +TENSE ] / _ [ +TENSE +GLIDE ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "amj > emj",
    "code": "[ +VOWEL ] > [ +RAISED ] / _ [ ] [ +UNROUND +CLOSE +GLIDE ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "double articulation",
    "code": "[ +VELAR +OCCL +LABIAL ] > [ +LABIOVELAR ] /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "double articulation",
    "code": "[ +VELAR +OCCL ] > [ +LABIOVELAR ] / _ [ +LABIAL ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "double articulation",
    "code": "[ +SHORT +VELAR +OCCL ] > [ +LABIOVELAR ] / [ +LABIAL ] _ #"
  }, {
    "chance": 0.010, "type": "mute", "comment": "double articulation",
    "code": "[ +CORON +OCCL +LABIAL ] > [ +LABIOCORON ] /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "double articulation",
    "code": "[ +CORON +OCCL ] > [ +LABIOCORON ] / _ [ +LABIAL ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "double articulation",
    "code": "[ +SHORT +CORON +OCCL ] > [ +LABIOCORON ] / [ +LABIAL ] _ #"
  }, {
    "chance": 0.005, "type": "mute", "comment": "labialization of dorsals",
    "code": "[ +DORSAL ] > [ +LABIALIZ ] / _ [ +LABIAL +VOCOID ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "labialization",
    "code": "[ ] > [ +LABIALIZ ] / _ [ +LABIAL +VOCOID ]"
  }, {
    "chance": 0.005, "type": "mute", "comment": "labialization",
    "code": "[ ] > [ +LABIALIZ ] / [ +LABIAL +VOCOID ] _"
  }, {
    "chance": 0.002, "type": "mute", "comment": "palatalization",
    "code": "[ -VOCOID ] > [ +PALATALIZ ] / _ [ +PALATAL +VOCOID ]"
  }, {
    "chance": 0.005, "type": "mute", "comment": "palatalization",
    "code": "[ -VOCOID ] > [ +PALATALIZ ] / [ +PALATAL +VOCOID ] _"
  }, {
    "chance": 0.002, "type": "mute", "comment": "velarization",
    "code": "[ +CORON +OBSTR -PALATAL ] > [ +VELARIZ ] / _ [ +VELAR +VOCOID ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "velarization",
    "code": "[ +LABIAL -VOCOID ] > [ +VELARIZ ] / _ [ +VELAR +VOCOID ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "dark l",
    "code": "[ +LATERAL +CLOSE ] > [ +VELARIZ ] / _ [ -VOCOID ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "pharyngealization",
    "code": "[ -VOCOID -CLOSE ] > [ +PHARYNGEALIZ ] / _ [ +BREATHY ]"
  }, {
    "chance": 0.100, "type": "mute", "comment": "pharyngealization",
    "code": "[ +VELARIZ -CLOSE ] > [ +PHARYNGEALIZ ] /"
  }, {
    "chance": 0.005, "type": "mute", "comment": "nasalization",
    "code": "[ +VOCOID ] > [ +NASALIZ ] / _ [ +!NASAL ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "nasalization spread",
    "code": "[ +SONOR ] > [ +NASALIZ ] / _ [ +NASAL ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "rhoticizacion onto vowels",
    "code": "[ +UNSTRESS +VOWEL ] [ +RHOTIC ] > [ +UNSTRESS ]1 /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "we > je",
    "code": "[ +GLIDE ] > [ ±loke ±minorLoke ] / _ [ +VOWEL ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "wo > o",
    "code": "[ +LABIAL +GLIDE ] > / _ [ +LABIAL +VOWEL ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "je > e",
    "code": "[ +PALATAL +GLIDE ] > / _ [ +PALATAL +VOWEL ]"
  }, {
    "chance": 0.100, "type": "mute", "comment": "assimilation of lax vowels",
    "code": "[ +LAX ] [ -PRIMARY +LAX ] > [ +LONG ±loke ]0 /"
  }, {
    "chance": 0.200, "type": "mute", "comment": "assimilation of semivowels",
    "code": "[ +GLIDE ] [ +GLIDE ] > [ ±minorLoke ]0 /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "assimilation of ij",
    "code": "[ +HIGH +VOWEL ] [ +HIGH +GLIDE ] > [ +LONG ±loke ]0 /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "assimilation of ew to iː",
    "code": "[ +MID +VOWEL ] [ +HIGH +GLIDE ] > [ +LONG +HIGH ±loke ]0 /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "assimilation of ew to oː",
    "code": "[ +VOWEL ] [ +HIGH +GLIDE ] > [ +LONG +MID ±minorLoke ±loke ]0 /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "assimilation of ew to yː",
    "code": "[ +VOWEL ] [ +HIGH +GLIDE ] > [ +LONG +MID ±minorLoke ]0 /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "assimilation of jə",
    "code": "[ +GLIDE ] [ +LAX ] > [ +LONG +HIGH ±loke ±minorLoke ]1 /"
  }, {
    "chance": 0.200, "type": "mute", "comment": "assimilation of iu",
    "code": "[ +HIGH +VOWEL ] [ -PRIMARY +HIGH +VOWEL ] > [ +LONG ±loke ]0 /"
  }, {
    "chance": 0.500, "type": "mute", "comment": "assimilation of w~v",
    "code": "[ +WIBBLY ] [ +WIBBLY ] > [ ]0 /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "assimilation of coronals",
    "code": "[ -SYLLAB +CORON -!NASAL -VOCOID -SIBIL ] [ +CORON -VOCOID ] > [ +LONG ]1 /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "assimilation of labials",
    "code": "[ -SYLLAB +LABIAL -!NASAL -VOCOID ] [ +LABIAL -VOCOID ] > [ +LONG ]1 /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "assimilation of dorsals",
    "code": "[ -SYLLAB +DORSAL -!NASAL -VOCOID ] [ +DORSAL -VOCOID ] > [ +LONG ]1 /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "assimilation of palatals",
    "code": "[ -SYLLAB +PALATAL -!NASAL -VOCOID ] [ +PALATAL -VOWEL ] > [ +LONG ]1 /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "assimilation of velars",
    "code": "[ -SYLLAB +VELAR -!NASAL -VOCOID ] [ +VELAR -VOWEL ] > [ +LONG ]1 /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "assimilation of obstruents",
    "code": "[ -SYLLAB -SIBILANT +OBSTR +OCCL ] [ +OBSTR ] > [ +LONG ]1 /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "assimilation of sonorants",
    "code": "[ -SYLLAB +SONOR -VOCOID ] [ +SONOR -VOCOID ] > [ +LONG ]1 /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "assimilation of nasals",
    "code": "[ -SYLLAB +!NASAL ] [ +NASAL ] > [ +LONG ]1 /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "assimilation of nasals",
    "code": "[ -SYLLAB +NASAL ] [ +!NASAL ] > [ +LONG ]0 /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "assimilation of occlusives",
    "code": "[ -SYLLAB +OCCL -!NASAL ] [ +OCCL +OBSTR ] > [ +LONG ]1 /"
  }, {
    "chance": 0.050, "type": "mute", "comment": "assimilation of fricatives",
    "code": "[ -SYLLAB +FRIC ] [ +FRIC ] > [ +LONG ]1 /"
  }, {
    "chance": 0.200, "type": "mute", "comment": "assimilation of sibilants",
    "code": "[ +SIBILANT ] [ -SYLLAB +SIBILANT ] > [ +LONG ±loke ]0 /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "ft͡ʃ > ʃː",
    "code": "[ -SYLLAB +FRIC ] [ +AFFR ] > [ +LONG +FRIC ]1 /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "gn > ɲ",
    "code": "[ -SYLLAB +DORSAL +OCCL ] [ +ALVEO ] > [ +PALATAL ]1 /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "nd > dː",
    "code": "[ -SYLLAB +NASAL ] [ +VOICE +OCCL ] > [ +LONG ]1 /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "sk > ʃ",
    "code": "[ +CORON +FRIC ] [ -SYLLAB +DORSAL +OBSTR ] > [ +POSTALV ]0 /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "sr > ʂː",
    "code": "[ -SYLLAB -RHOTIC ] [ -SYLLAB +RHOTIC ] > [ +LONG +RETRO ]0 /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "kf > xː",
    "code": "[ +STOP ] [ -SYLLAB +FRIC ] > [ +LONG +FRIC ]0 /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "fl > lː",
    "code": "[ -SYLLAB ] [ +LATERAL +CLOSE ] > [ +LONG ]1 / # _"
  }, {
    "chance": 0.002, "type": "mute", "comment": "lt > ɬ",
    "code": "[ +LATERAL ] [ -SYLLAB +TENUIS +CORON ] > [ +TENUIS +FRIC ]0 /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "t͡ʃl > t͡ɬ",
    "code": "[ +POSTALV ] [ -SYLLAB +LATERAL ] > [ +LATERAL ]0 /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "aɫ > oː",
    "code": "[ +LOW +VOWEL ] [ -SYLLAB +VELAR +CLOSE ] > [ +LONG +MID +VELAR +LABIALIZ ]0 /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "fricative > aspiration",
    "code": "[ -VOICE +OBSTR ] [ -SYLLAB -VOICE +FRIC ] > [ +ASPIR ]0 /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "fricative > breathy",
    "code": "[ +VOICE +OBSTR ] [ -SYLLAB -VOICE +FRIC ] > [ +BREATHY ]0 /"
  }, {
    "chance": 0.300, "type": "mute", "comment": "h dropping after stops",
    "code": "[ +STOP ] [ -SYLLAB +GLOT +FRIC ] > [ +ASPIR ]0 /"
  }, {
    "chance": 0.300, "type": "mute", "comment": "h dropping after stops",
    "code": "[ +STOP ] [ -SYLLAB +GLOT +STOP ] > [ +EJECT ]0 /"
  }, {
    "chance": 0.002, "type": "harmonia", "comment": "rounding harmony",
    "code": "round vowel"
  }, {
    "chance": 0.002, "type": "harmonia", "comment": "tense/lax harmony",
    "code": "tense vowel"
  }, {
    "chance": 0.002, "type": "harmonia", "comment": "height harmony",
    "code": "hight vowel"
  }, {
    "chance": 0.002, "type": "harmonia", "comment": "frontness harmony",
    "code": "front vowel"
  }, {
    "chance": 0.050, "type": "mute", "comment": "raising dissimilation",
    "code": "[ +VOWEL ] > [ +RAISED ] / _ [ +LOW ]"
  }, {
    "chance": 0.050, "type": "mute", "comment": "lowering dissimilation",
    "code": "[ -HIGH +VOWEL ] > [ +LOWERED ] / _ [ -LOW ]"
  },
  {
    "chance": 0.010, "type": "mute", "comment": "wi > wej",
    "code": "[ +HIGH +VOWEL ] > [ +MID ] [ +NONSYLLAB ] / [ +HIGH ]"
  }, {
    "chance": 0.020, "type": "mute", "comment": "unrounding dissimilation",
    "code": "[ +LABIAL +VOWEL ] > [ +UNROUND +PALATAL ] / [ +LABIAL +VOCOID ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "dː > nd",
    "code": "[ +LONG +VOICE +STOP ] > [ +SHORT +NASAL ] [ +SHORT ] /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "lub > lib",
    "code": "[ +SHORT +VOWEL ] > [ +PALATAL ] / [ +LATERAL ] _ [ +LABIAL ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "kt > kr",
    "code": "[ +CORON +STOP ] > [ +TAP ] / [ +STOP ] _"
  }, {
    "chance": 0.020, "type": "mute", "comment": "aurar > aural",
    "code": "[ +VIBR ] > [ +LATERAL +CLOSE ] / [ +VIBR ] [ ] _"
  }, {
    "chance": 0.020, "type": "mute", "comment": "polal > polar",
    "code": "[ +LATERAL ] > [ +CENTRAL +TRILL ] / [ +LATERAL ] [ ] _"
  }, {
    "chance": 0.100, "type": "mute", "comment": "y-breakup",
    "code": "[ +PALATAL +LABIAL +VOWEL ] > [ +SHORT +UNROUND ]0 [ +SHORT +NONSYLLAB +HIGH +VELAR ]0 /"
  }, {
    "chance": 0.100, "type": "mute", "comment": "ɯ-breakup",
    "code": "[ +VELAR +UNROUND +VOWEL ] > [ +SHORT +LABIALIZ ]0 [ +SHORT +NONSYLLAB +HIGH +PALATAL ]0 /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "gar > gra",
    "code": "[ +VOWEL ] [ +LIQ ] > [ ]1 [ ]0 / [ -SONOR -CONT ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "gra > gar",
    "code": "[ +LIQ ] [ +VOWEL ] > [ ]1 [ ]0 / [ +NONSYLLAB ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "ask > aks",
    "code": "[ +SIBILANT ] [ -CORON +STOP ] > [ ]1 [ ]0 / _ [ +VOCOID ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "aks > ask",
    "code": "[ +STOP ] [ +SIBILANT ] > [ ]1 [ ]0 /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "uj > ɰy",
    "code": "[ +HIGH +VOWEL ] [ +GLIDE ] > [ ±loke ]1 [ ±loke ]0 /"
  }, {
    "chance": 0.010, "type": "mute", "comment": "ju > yɰ",
    "code": "[ +GLIDE ] [ +HIGH +VOWEL ] > [ ±loke ]1 [ ±loke ]0 /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "tp > pt",
    "code": "[ +CORON +STOP ] [ -CORON +STOP ] > [ ]1 [ ]0 /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "ral > lar",
    "code": "[ +LIQUID ] [ ] [ +LIQUID ] > [ ]2 [ ]1 [ ]0 /"
  }, {
    "chance": 0.020, "type": "mute", "comment": "epenthesize kt",
    "code": "> ə / [ +OCCL +OBSTR ] _ [ +OCCL ]"
  }, {
    "chance": 0.200, "type": "mute", "comment": "epenthesize zs",
    "code": "> ə / [ +SIBILANT ] _ [ +SIBILANT ]"
  }, {
    "chance": 0.020, "type": "mute", "comment": "epenthesize",
    "code": "> ə / [ +CORON +STOP ] _ [ +CORON ]"
  }, {
    "chance": 0.100, "type": "mute", "comment": "epenthesize tn",
    "code": "> s / [ +CORON +STOP ] _ [ +CORON +OCCL ]"
  }, {
    "chance": 0.050, "type": "mute", "comment": "epenthesize nr",
    "code": "> ə / [ -CONT ] _ [ +VIBR ]"
  }, {
    "chance": 0.005, "type": "mute", "comment": "",
    "code": "> ʔ / [ +SYLLAB ] _ [ +VOWEL ]"
  }, {
    "chance": 0.005, "type": "mute", "comment": "",
    "code": "> ʔ / [ +HIGH +VOWEL ] _ [ +VOWEL ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "ɛ́ > jɛ́",
    "code": "[ +SHORT +LAX +STRESS ] > [ +NONSYLLAB +SHORT +CLOSE ] [ ] / [ +SYLLAB ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "",
    "code": "[ +!PALATAL -VOCOID ] > j [ +ALVEO ] / [ +VOWEL ] _"
  }, {
    "chance": 0.005, "type": "mute", "comment": "",
    "code": "> j / [ +POSTALV ] _ [ +VOWEL ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "egg > aig",
    "code": "[ +PALATAL +MID +VOWEL ] > [ ] [ +CLOSE +NONSYLLAB ] / _ [ +VOICE +DORSAL -VOCOID ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "",
    "code": "> w / [ +LABIAL -GLIDE ] _ [ +VOWEL ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "uː > juː",
    "code": "> j / [ -GLIDE ] _ [ +LONG -PALATAL +HIGH +VOWEL ]"
  }, {
    "chance": 0.005, "type": "mute", "comment": "",
    "code": "> a / [ +MID +VOWEL ] _ [ -VOCOID ] [ +LOW ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "kw > kow",
    "code": "[ +GLIDE ] > [ +MID +UNSTRESS ] / [ -VOWEL +SPOKEN ] _"
  }, {
    "chance": 0.005, "type": "mute", "comment": "",
    "code": "[ +VOCOID ] [ +OBSTR ] > [ ]0 [ ]1 [ +SHORT +UNSTRESS ]0 / _ [ -CONT ]"
  }, {
    "chance": 0.050, "type": "mute", "comment": "mr > mbr",
    "code": "[ +!NASAL ] > [ ] [ +SHORT +NONSYLLAB +STOP ] / _ [ +LIQ ]"
  }, {
    "chance": 0.050, "type": "mute", "comment": "md > mbd",
    "code": "[ -CORON +!NASAL ] > [ +SHORT ] [ ±voze +SHORT +NONSYLLAB +STOP ] / _ [ +CORON +STOP ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "ms > mbs",
    "code": "[ +!NASAL ] > [ +SHORT ] [ +SHORT +NONSYLLAB +STOP ] / _ [ +FRIC ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "sr > str",
    "code": "[ +SIBILANT ] > [ +SHORT ] [ +SHORT +NONSYLLAB +STOP ] / _ [ +RHOTIC ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "fill hiatus with ɾ",
    "code": "> ɾ / [ +VOWEL ] _ [ +VOWEL ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "#ra > #ara",
    "code": "[ +TAP ] [ +VOCOID ] > [ +SHORT +UNSTRESS ]1 [ ]0 [ ]1 / [ -VOCOID ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "break up final clusters",
    "code": "> ə / [ +NONSYLLAB ] [ +NONSYLLAB ] _ #"
  }, {
    "chance": 0.010, "type": "mute", "comment": "final er > ere",
    "code": "> ə / [ +RHOTIC ] _ #"
  }, {
    "chance": 0.010, "type": "mute", "comment": "final i > iɴ",
    "code": "> ɴ / [ +HIGH +PALATAL +STRESS ] _ #"
  }, {
    "chance": 0.010, "type": "mute", "comment": "h dropping",
    "code": "[ -STRESS +GLOT +FRIC ] > / _ [ +SPOKEN ]"
  }, {
    "chance": 0.020, "type": "mute", "comment": "h dropping when unstressd",
    "code": "[ -STRESS +GLOT +FRIC ] > / _ [ +SPOKEN -STRESS ]"
  }, {
    "chance": 0.020, "type": "mute", "comment": "h dropping before high vowel",
    "code": "[ -STRESS +GLOT +FRIC ] > / _ [ +HIGH ]"
  }, {
    "chance": 0.100, "type": "mute", "comment": "h dropping before consonants",
    "code": "[ -STRESS +GLOT ] > / _ [ +SPOKEN -VOCOID ]"
  }, {
    "chance": 0.050, "type": "mute", "comment": "h dropping after consonants",
    "code": "[ -STRESS +GLOT ] > / [ +SPOKEN -VOCOID ] _"
  }, {
    "chance": 0.200, "type": "mute", "comment": "h dropping in coda",
    "code": "[ +SYLLAB ] [ -STRESS +GLOT ] > [ +LONG ]0 / _ [ -VOCOID ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "yod dropping",
    "code": "[ +PALATAL +GLIDE +MEDIAN ] > / [ +CORONAL ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "wubble-u dropping",
    "code": "[ +LABIAL +GLIDE ] > / [ +LABIAL ] _"
  }, {
    "chance": 0.005, "type": "mute", "comment": "more w dropping",
    "code": "[ +VELAR +GLIDE ] > / [ -DORSAL +SPOKEN ] _"
  }, {
    "chance": 0.010, "type": "mute", "comment": "more w dropping",
    "code": "[ +VELAR +GLIDE ] > / _ [ +PALATAL +VOCOID ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "loss of nonlabial velar approx",
    "code": "[ +VELAR +UNROUND +GLIDE ] > / _ [ +SPOKEN ]"
  }, {
    "chance": 0.200, "type": "mute", "comment": "loss of central glides",
    "code": "[ +CENTRAL +GLIDE ] > / _ [ +SPOKEN ]"
  }, {
    "chance": 0.010, "type": "mute", "comment": "ija > ja",
    "code": "[ -STRESS +VOWEL ] [ +GLIDE ] > [ ]1 / [ -GLIDE ] _ [ +VOWEL ]"
  }, {
    "chance": 0.020, "type": "mute", "comment": "kija > kːja",
    "code": "[ +STOP ] [ -STRESS +VOWEL ] [ +GLIDE ] > [ +LONG ]0 [ ]2 / _ [ +VOWEL ]"
  }, {
    "chance": 0.005, "type": "mute", "comment": "elision of k specifically",
    "code": "[ -STRESS +SHORT +DORSAL +STOP ] > / [ +VOCOID ] _ [ +PALATAL ]"
  }, {
    "chance": 0.005, "type": "mute", "comment": "elision of d specifically",
    "code": "[ -STRESS +SHORT +CORON +STOP ] > / [ +VOCOID ] _ [ +STRESS ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "loss of dorsal nasal",
    "code": "[ +VOCOID ] [ -STRESS +DORSAL +!NASAL ] > [ +LONG ]0 /"
  }, {
    "chance": 0.002, "type": "mute", "comment": "loss intervocalic nasal",
    "code": "[ +VOCOID ] [ -STRESS +!NASAL ] > [ +LONG ]0 / _ [ +CONT ]"
  }, {
    "chance": 0.020, "type": "mute", "comment": "loss of redundant nasal",
    "code": "[ -STRESS +!NASAL ] > / [ +NASAL ] _"
  }, {
    "chance": 0.002, "type": "mute", "comment": "loss of redundant nasal",
    "code": "[ -STRESS +!NASAL ] > / [ -CONT ] _ [ +OBSTR ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "loss of final voiced obstruent",
    "code": "[ ] [ -STRESS +VOICE +OBSTR ] > [ +LONG ]0 / _ #"
  }, {
    "chance": 0.010, "type": "mute", "comment": "loss of pre-rhotic sonorant",
    "code": "[ -SYLLAB +SONOR ] > / _ [ +RHOTIC ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "loss of final fricative",
    "code": "[ +SONOR ] [ -STRESS +FRIC ] > [ +LONG ]0 / _ [ -SYLLAB -LIQ ]"
  }, {
    "chance": 0.050, "type": "mute", "comment": "loss of final stop after nasal",
    "code": "[ -STRESS +VOICE +STOP ] > / [ +NASAL ] _ [ -SYLLAB -LIQ ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "loss of final stop",
    "code": "[ -STRESS +STOP ] > / [ +SPOKEN ] _ [ -SYLLAB -LIQ ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "loss of final consonant",
    "code": "[ +SHORT +NONSYLLAB ] > / [ +SPOKEN ] _ #"
  }, {
    "chance": 0.002, "type": "mute", "comment": "loss of final vowel",
    "code": "[ -STRESS +SHORT +VOCOID ] > / [ +SPOKEN ] _ #"
  }, {
    "chance": 0.005, "type": "mute", "comment": "loss of hiatus",
    "code": "[ -STRESS +VOWEL ] > / _ [ +VOWEL ]"
  }, {
    "chance": 0.002, "type": "mute", "comment": "loss of lax vowel",
    "code": "[ +UNSTRESS +LAX ] > / [ +SPOKEN ] _"
  }, {
    "chance": 0.002, "type": "mute", "comment": "loss of high vowel",
    "code": "[ +UNSTRESS +HIGH ] > / [ +SPOKEN ] _"
  }, {
    "chance": 0.002, "type": "mute", "comment": "loss of short vowel",
    "code": "[ +UNSTRESS +SHORT -LOW ] > / [ +SPOKEN ] _"
  }, {
    "chance": 0.100, "type": "mute", "comment": "simplification of big clusters",
    "code": "[ +NONSYLLAB ] > / _ [ +NONSYLLAB ] [ +NONSYLLAB ] [ +NONSYLLAB ]"
  }, {
    "chance": 0.020, "type": "mute", "comment": "simplification of big clusters",
    "code": "[ +SHORT +NONSYLLAB ] > / [ +NONSYLLAB ] _ [ +NONSYLLAB ]"
  }, {
    "chance": 1.000, "type": "mute", "comment": "glides need vowel adjacency",
    "code": "[ +GLIDE ] > [ +UNSTRESS ] / [ -VOWEL ] _ [ -VOWEL ]"
  }, {
    "chance": 0.060, "type": "silabe", "comment": "",
    "code": "4"
  }, {
    "chance": 0.030, "type": "silabe", "comment": "",
    "code": "3"
  }, {
    "chance": 0.015, "type": "silabe", "comment": "",
    "code": "2"
  }, {
    "chance": 0.008, "type": "silabe", "comment": "",
    "code": "1"
  }, {
    "chance": 0.004, "type": "silabe", "comment": "",
    "code": "0"
  }, {
    "chance": 0.001, "type": "acente", "comment": "",
    "code": "right 0"
  }, {
    "chance": 0.020, "type": "acente", "comment": "",
    "code": "right 1"
  }, {
    "chance": 0.002, "type": "acente", "comment": "",
    "code": "right 2"
  }, {
    "chance": 0.015, "type": "acente", "comment": "",
    "code": "left 0"
  }, {
    "chance": 0.002, "type": "acente", "comment": "",
    "code": "left 1"
  }, {
    "chance": 0.002, "type": "acente", "comment": "",
    "code": "left 2"
  }, {
    "chance": 0.100, "type": "compounding", "comment": "elision of pauses",
    "code": ""
  }, {
    "chance": 1.000, "type": "mute", "comment": "handle the ejective vowel workaround (see the code regarding +RAISED)",
    "code": "[ +EJECT +HIGH ] > [ +VOICE +SHORT ]0 [ +VOICE +SHORT +CLOSE +NONSYLLAB ]0 /"
  }, {
    "chance": 1.000, "type": "mute", "comment": "disallow nasalized approximants",
    "code": "[ +NASALIZ -VOCOID +CLOSE ] > [ +NASAL ] /"
  }, {
    "chance": 1.000, "type": "mute", "comment": "disallow linguolabial trills",
    "code": "[ +LINGUOLAB +TRILL ] > [ +TAP ] /"
  }
];
