export default {
  editor: {
    label: {
      en: "Call Recording Player",
      de: "Anrufaufzeichnung Player"
    },
    icon: "fontawesome/solid/phone-volume",
  },
  properties: {
    // Audio Configuration
    audioUrl: {
      label: { en: "Audio URL", de: "Audio-URL" },
      type: "Text",
      section: "settings",
      bindable: true,
      defaultValue: "",
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "URL to the audio file (mp3, wav, ogg, etc.)"
      },
      propertyHelp: "Provide the URL to your call recording audio file"
      /* wwEditor:end */
    },

    audioBinaryString: {
      label: { en: "Audio Binary String", de: "Audio-Binärdaten" },
      type: "Text",
      section: "settings",
      bindable: true,
      defaultValue: "",
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "Supports: Base64 strings, Blob objects, ArrayBuffer, data URLs, or blob URLs from Edge Functions"
      },
      propertyHelp: "Audio data from Edge Functions. Supports multiple formats: Base64 string, Blob, ArrayBuffer, data:audio URL, or blob: URL. Used if Audio URL is not provided. Check browser console for format detection logs."
      /* wwEditor:end */
    },

    // Transcript Array (MANDATORY Professional Pattern)
    transcript: {
      label: { en: "Transcript", de: "Transkript" },
      type: "Array",
      section: "settings",
      bindable: true,
      defaultValue: [
        { time: 0, duration: 3, speaker: "agent", text: "Agent: Hello, how can I help you?" },
        { time: 3, duration: 5, speaker: "customer", text: "Customer: I need support with my account." }
      ],
      options: {
        expandable: true,
        getItemLabel(item) {
          const speakerName = item?.speaker || "Unknown";
          const timestamp = item?.time ? `${Math.floor(item.time / 60)}:${String(Math.floor(item.time % 60)).padStart(2, '0')}` : "0:00";
          return `${timestamp} - ${speakerName}`;
        },
        item: {
          type: "Object",
          defaultValue: { time: 0, duration: 5, speaker: "agent", text: "New transcript line" },
          options: {
            item: {
              time: {
                label: { en: "Start Time (seconds)", de: "Startzeit (Sekunden)" },
                type: "Number",
                defaultValue: 0
              },
              duration: {
                label: { en: "Duration (seconds)", de: "Dauer (Sekunden)" },
                type: "Number",
                defaultValue: 5
              },
              speaker: {
                label: { en: "Speaker", de: "Sprecher" },
                type: "Text",
                defaultValue: "agent"
              },
              text: {
                label: { en: "Text", de: "Text" },
                type: "LongText",
                defaultValue: ""
              }
            }
          }
        }
      },
      /* wwEditor:start */
      bindingValidation: {
        type: "array",
        tooltip: "Array of transcript segments with time, duration, speaker, and text"
      },
      propertyHelp: "Add transcript segments with timestamps. Each segment needs: time (seconds), duration (seconds), speaker (agent/customer), and text"
      /* wwEditor:end */
    },

    // Formula Properties for Dynamic Field Mapping
    transcriptTimeFormula: {
      label: { en: "Time Field", de: "Zeitfeld" },
      type: "Formula",
      section: "settings",
      options: content => ({
        template: Array.isArray(content.transcript) && content.transcript.length > 0 ? content.transcript[0] : null,
      }),
      defaultValue: {
        type: "f",
        code: "context.mapping?.['time'] || context.mapping?.['start_time']",
      },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.transcript) || !content.transcript?.length || !boundProps.transcript,
      /* wwEditor:start */
      bindingValidation: {
        type: "number",
        tooltip: "Start time in seconds for this transcript segment (supports 'time' or 'start_time' fields)"
      }
      /* wwEditor:end */
    },

    transcriptDurationFormula: {
      label: { en: "Duration Field", de: "Dauerfeld" },
      type: "Formula",
      section: "settings",
      options: content => ({
        template: Array.isArray(content.transcript) && content.transcript.length > 0 ? content.transcript[0] : null,
      }),
      defaultValue: {
        type: "f",
        code: "context.mapping?.['duration']",
      },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.transcript) || !content.transcript?.length || !boundProps.transcript,
      /* wwEditor:start */
      bindingValidation: {
        type: "number",
        tooltip: "Duration in seconds for this transcript segment"
      }
      /* wwEditor:end */
    },

    transcriptSpeakerFormula: {
      label: { en: "Speaker Field", de: "Sprecher-Feld" },
      type: "Formula",
      section: "settings",
      options: content => ({
        template: Array.isArray(content.transcript) && content.transcript.length > 0 ? content.transcript[0] : null,
      }),
      defaultValue: {
        type: "f",
        code: "context.mapping?.['speaker']",
      },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.transcript) || !content.transcript?.length || !boundProps.transcript,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "Speaker identifier (agent or customer)"
      }
      /* wwEditor:end */
    },

    transcriptTextFormula: {
      label: { en: "Text Field", de: "Text-Feld" },
      type: "Formula",
      section: "settings",
      options: content => ({
        template: Array.isArray(content.transcript) && content.transcript.length > 0 ? content.transcript[0] : null,
      }),
      defaultValue: {
        type: "f",
        code: "context.mapping?.['text']",
      },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.transcript) || !content.transcript?.length || !boundProps.transcript,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "The transcript text content"
      }
      /* wwEditor:end */
    },

    // Speaker Configuration
    agentColor: {
      label: { en: "Agent Color", de: "Agent-Farbe" },
      type: "Color",
      section: "settings",
      defaultValue: "#3b82f6",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "Color for agent segments and transcript lines"
      }
      /* wwEditor:end */
    },

    customerColor: {
      label: { en: "Customer Color", de: "Kunden-Farbe" },
      type: "Color",
      section: "settings",
      defaultValue: "#10b981",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "Color for customer segments and transcript lines"
      }
      /* wwEditor:end */
    },

    agentLabel: {
      label: { en: "Agent Label", de: "Agent-Bezeichnung" },
      type: "Text",
      section: "settings",
      defaultValue: "Agent",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "Display name for the agent/assistant"
      }
      /* wwEditor:end */
    },

    customerLabel: {
      label: { en: "Customer Label", de: "Kunden-Bezeichnung" },
      type: "Text",
      section: "settings",
      defaultValue: "Customer",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "Display name for the customer/caller"
      }
      /* wwEditor:end */
    },

    // Playback Settings
    initialSpeed: {
      label: { en: "Initial Speed", de: "Start-Geschwindigkeit" },
      type: "TextSelect",
      section: "settings",
      options: {
        options: [
          { value: "0.5", label: "0.5x" },
          { value: "0.75", label: "0.75x" },
          { value: "1", label: "1x (Normal)" },
          { value: "1.25", label: "1.25x" },
          { value: "1.5", label: "1.5x" },
          { value: "2", label: "2x" }
        ]
      },
      defaultValue: "1",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "Valid values: 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2"
      }
      /* wwEditor:end */
    },

    autoPlay: {
      label: { en: "Auto Play", de: "Automatisch Abspielen" },
      type: "OnOff",
      section: "settings",
      defaultValue: false,
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "boolean",
        tooltip: "Automatically start playing when loaded"
      }
      /* wwEditor:end */
    },

    showTranscriptByDefault: {
      label: { en: "Show Transcript by Default", de: "Transkript standardmäßig anzeigen" },
      type: "OnOff",
      section: "settings",
      defaultValue: false,
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "boolean",
        tooltip: "Show transcript panel on component load"
      }
      /* wwEditor:end */
    },

    // UI Text Customization
    loadingText: {
      label: { en: "Loading Text", de: "Ladetext" },
      type: "Text",
      section: "settings",
      defaultValue: "⏳ Loading audio...",
      bindable: true,
    },

    speedLabel: {
      label: { en: "Speed Label", de: "Geschwindigkeits-Bezeichnung" },
      type: "Text",
      section: "settings",
      defaultValue: "Speed:",
      bindable: true,
    },

    showTranscriptText: {
      label: { en: "Show Transcript Text", de: "Transkript anzeigen Text" },
      type: "Text",
      section: "settings",
      defaultValue: "Show Transcript",
      bindable: true,
    },

    hideTranscriptText: {
      label: { en: "Hide Transcript Text", de: "Transkript ausblenden Text" },
      type: "Text",
      section: "settings",
      defaultValue: "Hide Transcript",
      bindable: true,
    },

    transcriptTitle: {
      label: { en: "Transcript Title", de: "Transkript-Titel" },
      type: "Text",
      section: "settings",
      defaultValue: "Call Transcript",
      bindable: true,
    },

    jumpToLineHint: {
      label: { en: "Jump Hint Text", de: "Sprung-Hinweis Text" },
      type: "Text",
      section: "settings",
      defaultValue: "💡 Click on a transcript line to jump to that moment",
      bindable: true,
    },

    // Style Properties
    backgroundColor: {
      label: { en: "Background Color", de: "Hintergrundfarbe" },
      type: "Color",
      section: "style",
      defaultValue: "#f9fafb",
      bindable: true,
    },

    cardBackgroundColor: {
      label: { en: "Card Background", de: "Karten-Hintergrund" },
      type: "Color",
      section: "style",
      defaultValue: "#ffffff",
      bindable: true,
    },

    cardBorderRadius: {
      label: { en: "Card Border Radius", de: "Karten-Randradius" },
      type: "Length",
      section: "style",
      defaultValue: "8px",
      bindable: true,
    },

    primaryTextColor: {
      label: { en: "Primary Text Color", de: "Primäre Textfarbe" },
      type: "Color",
      section: "style",
      defaultValue: "#111827",
      bindable: true,
    },

    secondaryTextColor: {
      label: { en: "Secondary Text Color", de: "Sekundäre Textfarbe" },
      type: "Color",
      section: "style",
      defaultValue: "#6b7280",
      bindable: true,
    },

    playButtonColor: {
      label: { en: "Play Button Color", de: "Play-Button Farbe" },
      type: "Color",
      section: "style",
      defaultValue: "#111827",
      bindable: true,
    },

    progressBarBackground: {
      label: { en: "Progress Bar Background", de: "Fortschrittsleiste Hintergrund" },
      type: "Color",
      section: "style",
      defaultValue: "#e5e7eb",
      bindable: true,
    },

    // Border Properties
    cardBorderWidth: {
      label: { en: "Border Width", de: "Rahmenbreite" },
      type: "Length",
      section: "style",
      defaultValue: "1px",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "Border width (e.g., 1px, 2px, 0px for no border)"
      }
      /* wwEditor:end */
    },

    cardBorderColor: {
      label: { en: "Border Color", de: "Rahmenfarbe" },
      type: "Color",
      section: "style",
      defaultValue: "#e5e7eb",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "Color of the card border"
      }
      /* wwEditor:end */
    },

    cardBorderStyle: {
      label: { en: "Border Style", de: "Rahmenstil" },
      type: "TextSelect",
      section: "style",
      options: {
        options: [
          { value: "solid", label: "Solid" },
          { value: "dashed", label: "Dashed" },
          { value: "dotted", label: "Dotted" },
          { value: "double", label: "Double" },
          { value: "none", label: "None" }
        ]
      },
      defaultValue: "solid",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "Valid values: solid | dashed | dotted | double | none"
      }
      /* wwEditor:end */
    },

    cardShadow: {
      label: { en: "Card Shadow", de: "Karten-Schatten" },
      type: "Text",
      section: "style",
      defaultValue: "0 1px 3px rgba(0,0,0,0.1)",
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip: "CSS box-shadow value (e.g., '0 1px 3px rgba(0,0,0,0.1)' or 'none')"
      }
      /* wwEditor:end */
    },
  },

  triggerEvents: [
    {
      name: "play",
      label: { en: "On Play", de: "Bei Abspielen" },
      event: { currentTime: 0 }
    },
    {
      name: "pause",
      label: { en: "On Pause", de: "Bei Pause" },
      event: { currentTime: 0 }
    },
    {
      name: "ended",
      label: { en: "On Ended", de: "Bei Beendet" },
      event: {}
    },
    {
      name: "time-update",
      label: { en: "On Time Update", de: "Bei Zeit-Update" },
      event: { currentTime: 0, duration: 0, progress: 0 }
    },
    {
      name: "transcript-click",
      label: { en: "On Transcript Click", de: "Bei Transkript-Klick" },
      event: { time: 0, speaker: "", text: "" }
    },
    {
      name: "speed-change",
      label: { en: "On Speed Change", de: "Bei Geschwindigkeitsänderung" },
      event: { speed: 1 }
    },
    {
      name: "transcript-toggle",
      label: { en: "On Transcript Toggle", de: "Bei Transkript umschalten" },
      event: { isVisible: false }
    },
  ],
};
