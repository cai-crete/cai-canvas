const fs = require('fs');
const path = 'd:/OneDrive/바탕 화면/CRETE/change-viewpoint/src/App.tsx';
let txt = fs.readFileSync(path, 'utf8');

const sIdx = txt.indexOf('  const handleGenerate = async () => {\n    // [PHASE 4 - Step 1] Integration Validation');
const eTxt = '    }\n  };\n\n  return (\n    <div className="h-[100dvh]';
const eIdx = txt.indexOf(eTxt);

if (sIdx === -1 || eIdx === -1) {
  console.log('NOT FOUND', sIdx, eIdx);
  process.exit(1);
}

const newHandleGenerate = `  const handleGenerate = async () => {
    const sourceItem = selectedItemId 
      ? canvasItems.find(item => item.id === selectedItemId) 
      : (canvasItems.length > 0 ? canvasItems[0] : null);

    if (!sourceItem) {
      alert("Please upload at least one image first.");
      return;
    }

    const hasInitialViews = canvasItems.some(i => i.type === 'generated' && i.motherId === sourceItem.id);
    const isFirstTime = sourceItem.type === 'upload' && !hasInitialViews;

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const v0_angle    = analyzedOpticalParams?.angle    || 'Unknown';
      const v0_altitude = analyzedOpticalParams?.altitude || 'Unknown';
      const v0_lens     = analyzedOpticalParams?.lens     || 'Unknown';
      const v0_time     = analyzedOpticalParams?.time     || 'Unknown';

      const getAngle = (base) => {
        if (['07:30', '09:00', '10:30'].includes(base)) return '07:30';
        return '04:30';
      };

      const viewsToGenerate = [];

      if (isFirstTime) {
        const baseAngle = v0_angle === 'Unknown' ? '06:00' : v0_angle;
        const cornerAngle = getAngle(baseAngle);
        const perspectiveAngle = baseAngle === '06:00' ? cornerAngle : '06:00';
        
        viewsToGenerate.push({
          angle: cornerAngle,
          altitude: "150m (Bird's eye view)",
          lens: "32mm Aerial Lens",
          distance: "approx 200m",
          scenario: "Aerial / Bird's eye",
        });
        viewsToGenerate.push({
          angle: perspectiveAngle,
          altitude: "1.6m (Street level)",
          lens: "Analyze and choose best between: 23mm Tilt-Shift OR 24mm Wide Lens",
          distance: "Standard",
          scenario: "Street View",
        });
        viewsToGenerate.push({
          angle: cornerAngle,
          altitude: "10m (Low Aerial View)",
          lens: "110mm Macro Lens",
          distance: "approx 10m",
          scenario: "Detail / Close-up",
        });
      } else {
        viewsToGenerate.push({
          angle: ANGLES[angleIndex],
          altitude: ALTITUDES[altitudeIndex].label,
          lens: LENSES[lensIndex].label,
          distance: "Standard",
          scenario: determineScenario(ANGLES[angleIndex], ALTITUDES[altitudeIndex].value, LENSES[lensIndex].value),
        });
      }

      let actualImageSrc = sourceItem.src;
      if (sourceItem.type === 'generated' && sourceItem.motherId) {
        const motherItem = canvasItems.find(i => i.id === sourceItem.motherId);
        if (motherItem) actualImageSrc = motherItem.src;
      }
      const base64Data = actualImageSrc.split(',')[1];
      const mimeType = actualImageSrc.split(';')[0].split(':')[1];

      for (const viewConfig of viewsToGenerate) {
        const currentTime = TIMES[timeIndex];

        const layerB_viewpoint = \`
# ACTION PROTOCOL (MANDATORY EXECUTION WORKFLOW)
## Pre-Step: Reality Anchoring & Camera Delta Calculation
- V₀ (Current Camera Position — AI Reverse-Engineered):
    Angle: \${v0_angle} o'clock | Altitude: \${v0_altitude} | Lens: \${v0_lens} | Time: \${v0_time}
    This is the exact camera position from which the SOURCE IMAGE (IMAGE 1) was captured.
- V₁ (Target Camera Position — User Command):
    Angle: \${viewConfig.angle} o'clock | Altitude: \${viewConfig.altitude} | Lens: \${viewConfig.lens} | Time: \${currentTime}
- Δ Movement Vector: Orbit from \${v0_angle} → \${viewConfig.angle} | Altitude change: \${v0_altitude} → \${viewConfig.altitude}
    Execute this as a precise Physical Camera Orbit around the immutable building geometry.

## Step 1: Coordinate Anchoring & Vector Calculation
- Reference: Building main facade fixed at 06:00 (Front).
- Target Vector: \${viewConfig.angle}
- Altitude: \${viewConfig.altitude}

## Step 2: Scenario Mapping & Optical Engineering
- Scenario: \${viewConfig.scenario}
- Lens: \${viewConfig.lens}
- Time of Day: \${currentTime}\`;

        const layerC_property = elevationParams ? \`
## Step 5: Structural & Material Parameters (PHASE 2 AEPL Data — Immutable)
- Mass Typology: \${elevationParams.mass_typology || 'N/A'}
- Core Typology: \${elevationParams.core_typology || 'N/A'}
- Base Material: \${elevationParams.base_material || 'N/A'}
- Fenestration: \${elevationParams.fenestration_type || 'N/A'}
- Balcony/Projection: \${elevationParams.has_balcony || 'False'}\` : '';

        const layerC_blindspot = \`
## Step 3: Layering & Blind Spot Inference
- Perspective: \${viewConfig.angle === '06:00' ? '1-Point (face-on)' : '2-Point (corner/side)'}
- Blind Spot Logic: If target is Rear (12:00) or hidden side, extract Design DNA from front, infer MEP/Service Door placement.
- Material Injection: Lock original textures. Apply Relighting only for new solar angle (\${currentTime}).\`;

        let activeElevationSlots = getElevationSlot(viewConfig.angle);
        if (activeElevationSlots.length === 0) activeElevationSlots = getElevationSlot("06:00");

        const finalPrompt = \`
# SYSTEM: 5-Point Integrated Viewpoint Simulation Architect (5-IVSP)

# GOAL
Change the angle of view of the provided architectural image to a specific new perspective without altering the building's original geometry, materials, or style. Execute a "Physical Movement Command" within a completed 3D reality — precise Coordinate-Based Virtual Photography.

# INPUT IMAGES
- IMAGE 1 (Primary): The original uploaded architectural photo. Source of Truth for materials and visible geometry.
\${activeElevationSlots.length === 1
  ? \`- IMAGE 2 (Geometric Reference): The pre-computed \${activeElevationSlots[0].label} elevation orthographic drawing, generated by PHASE 2 architectural inference. Use this as the STRICT geometric blueprint for the target viewpoint. The architectural form, proportions, and element placement MUST be reflected in the output.\`
  : \`- IMAGE 2 (Geometric Reference A): The pre-computed \${activeElevationSlots[0].label} elevation — first adjacent face for this corner viewpoint.
- IMAGE 3 (Geometric Reference B): The pre-computed \${activeElevationSlots[1] ? activeElevationSlots[1].label : activeElevationSlots[0].label} elevation — second adjacent face for this corner viewpoint.
  Both elevations are pre-computed by PHASE 2. Use them as the STRICT geometric blueprint. The 2-Point Perspective output MUST integrate both faces correctly.\`
}

# CONTEXT
- Ontological Status: The input image is a "Completed Architectural Reality." Fixed physical object, not a sketch.
- Geometric Sanctuary: The building's proportions, structure, and ALL details are Immutable Constants. Only the observer (Brown Point) moves.
- Operational Logic: Intuition-to-Coordinate Translation applied.

# ROLE
Coordinate Controller & Virtual Architectural Photographer.
\${layerB_viewpoint}
\${layerC_blindspot}
\${layerC_property}

## Step 4: Final Execution & Compliance Check
- Command: Orbit the Brown Point to the target coordinate and capture the Completed Reality using the optical setup from Step 2.
- Compliance:
  [ ] Original geometry preserved 100%? (No Hallucination)
  [ ] Perspective mathematically correct? (No Distortion)
  [ ] Blind spot logically inferred? (No Blank Spaces)
  [ ] IMAGE 2 elevation geometry reflected in output? (No Deviation)
\${prompt ? \`\\nAdditional instruction: \${prompt}\` : ''}

[GENERATE IMAGE NOW]\`.trim();

        const runGen = async (modelName) => {
          const parts = [
            { inlineData: { data: base64Data, mimeType: mimeType } },
          ];

          if (architecturalSheetImage) {
            for (const slot of activeElevationSlots) {
              try {
                const croppedElevation = await cropElevationFromSheet(architecturalSheetImage, slot);
                const cropBase64 = croppedElevation.split(',')[1];
                parts.push({ inlineData: { data: cropBase64, mimeType: 'image/png' } });
              } catch (e) {
                console.warn('[V70] Elevation crop failed:', slot.label, e);
              }
            }
          }

          parts.push({ text: finalPrompt });

          const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts },
          });

          if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
                const generatedSrc = \`data:\${part.inlineData.mimeType};base64,\${part.inlineData.data}\`;
                
                await new Promise((resolve) => {
                  const img = new Image();
                  img.onload = () => {
                    const newGenItem = {
                      id: \`gen-\${Date.now()}-\${Math.floor(Math.random()*1000)}\`,
                      type: 'generated',
                      src: generatedSrc,
                      x: 0,
                      y: sourceItem.y,
                      width: (img.width / img.height) * sourceItem.height,
                      height: sourceItem.height,
                      motherId: sourceItem.motherId || sourceItem.id,
                      parameters: {
                        angleIndex,
                        altitudeIndex,
                        lensIndex,
                        timeIndex,
                        analyzedOpticalParams,
                        elevationParams,
                        sitePlanImage,
                        architecturalSheetImage
                      }
                    };
                    
                    setCanvasItems(prev => {
                      setHistoryStates(prevH => [...prevH, prev]);
                      
                      let maxEdgeX = sourceItem.x + sourceItem.width;
                      for (const item of prev) {
                        if (Math.abs(item.y - sourceItem.y) < 10) {
                            const rightEdge = item.x + item.width;
                            if (rightEdge > maxEdgeX) maxEdgeX = rightEdge;
                        }
                      }
                      
                      let currentX = maxEdgeX + 40;
                      let currentY = sourceItem.y;
                      let hasOverlap = true;
                      while (hasOverlap) {
                        hasOverlap = false;
                        for (const item of prev) {
                          if (
                            currentX < item.x + item.width &&
                            currentX + newGenItem.width > item.x &&
                            currentY < item.y + item.height &&
                            currentY + newGenItem.height > item.y
                          ) {
                            currentX = item.x + item.width + 40;
                            hasOverlap = true;
                            break;
                          }
                        }
                      }

                      newGenItem.x = currentX;
                      newGenItem.y = currentY;

                      return [...prev, newGenItem];
                    });
                    setSelectedItemId(newGenItem.id);
                    if (!isFirstTime) setActiveTab('result');
                    resolve();
                  };
                  img.src = generatedSrc;
                });
                return true;
              }
            }
          }
          return false;
        };

        try {
          const success = await runGen(IMAGE_GEN);
          if (!success) throw new Error("Fallback needed");
        } catch (e) {
          const successFallback = await runGen(IMAGE_GEN_FALLBACK);
          if (!successFallback) {
             console.error("Failed to generate view with fallback");
          }
        }
      } // end for loop
    } catch (error) {
      console.error("Generation Error:", error);
      alert("An error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };`;

txt = txt.substring(0, sIdx) + newHandleGenerate + '\\n  };\n\n  return (\n    <div className=\"h-[100dvh]' + txt.substring(eIdx + 48);
fs.writeFileSync(path, txt, 'utf8');
console.log('REPLACEMENT SUCCESSFUL!');
