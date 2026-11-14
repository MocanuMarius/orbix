# Guardian placement and static scenery

Removed the screen-space guardian portraits, including the older silhouettes drawn before fog. The replacement is a pitch-black armored figure anchored beside the exit landmark, behind terrain and the refuge. It enters view only when the camera reaches the final area. Its cloak and head move subtly; helm and weapon contours vary by guardian. A muted local backdrop defines the silhouette without glowing outlines, eyes or changing gameplay illumination.

Ordinary canopy landforms previously inherited a sine-wave vertical displacement of 0.3% to 0.8% of viewport height. This moved scenery and colliders even when the surface was meant to be static. Ordinary generated terrain now has zero motion. Explicit guardian gates and biome actors retain their own movement.

Validation: 36 ordinary layouts across all three terrain families have zero background landform motion; guardian screen position changes exactly with camera distance and is culled far from the exit. Syntax checks passed. Browser preview confirms the figure stands behind the final refuge. No economy or hazard timing changes.
