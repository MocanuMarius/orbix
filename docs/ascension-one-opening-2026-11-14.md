# Ascension 1 opening, second pass

Applies to ordinary flights on map 1, route rows 0–2, irrespective of remembered tutorial state or TEST. Elites, guardians, later maps and higher Ascensions retain their existing rules.

- Generated course distance reduced 35%; speed is 85% of base (previously 92%). Crossing time is about 30% shorter than the previous first-map version.
- Opening terrain aperture at least 40% of viewport height, with wider authored gaps and no canopy sway.
- No local drafts, interactive hazards, harmful/special Sparks, or Black Holes in these opening flights. Subsequent routes introduce the normal mechanics.
- Existing pickup values, skills and death rules unchanged.

Found and corrected a benchmark mismatch: it still used old three-leg level lengths instead of current getFlightLengthProfile durations and one-leg layouts. Previous probe results are not representative of current map lengths.

Matched current-layout stress cases (96 before / 96 after): clears 19 → 28; mean progress .44 → .53; low-fuel deaths 35 → 27. These are synthetic controllers with latency and input omissions, not measured human win rates. Two seeds per terrain family, four roles and four control profiles. Remaining failures show this is not a claim that balance is finished.
