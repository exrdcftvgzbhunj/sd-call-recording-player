<template>
  <div class="call-recording-player" :style="containerStyle">
    <div class="card" :style="cardStyle">
      <audio
        ref="audioRef"
        preload="metadata"
        @loadedmetadata="handleLoadedMetadata"
        @canplay="handleCanPlay"
        @error="handleAudioError"
        @timeupdate="handleTimeUpdate"
        @ended="handleEnded"
        @play="handlePlay"
        @pause="handlePause"
      ></audio>

      <div v-if="hasError" class="alert alert-error">
        {{ errorMessage }}
      </div>
      <div v-if="isLoading" class="alert alert-info">
        {{ content?.loadingText || '⏳ Loading audio...' }}
      </div>

      <div class="time-display">
        <span class="time-text" :style="{ color: content?.primaryTextColor }">
          <span>{{ formattedCurrentTime }}</span> / <span>{{ formattedDuration }}</span>
        </span>
        <div class="speed-control">
          <span class="speed-label" :style="{ color: content?.secondaryTextColor }">
            {{ content?.speedLabel || 'Speed:' }}
          </span>
          <select
            v-model="currentSpeed"
            class="speed-select"
            @change="handleSpeedChange"
          >
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1">1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </div>
      </div>

      <div class="progress-container">
        <div class="progress-bar" @click="handleProgressClick" ref="progressBarRef">
          <div class="segments-background">
            <div
              v-for="(segment, index) in processedSegments"
              :key="index"
              class="speaker-segment"
              :class="{ played: segment.isPlayed }"
              :style="{
                width: segment.widthPercent + '%',
                backgroundColor: segment.color
              }"
            ></div>
          </div>
          <div class="progress-overlay" :style="{ width: progressPercent + '%' }"></div>
          <div class="progress-indicator" :style="{ left: progressPercent + '%' }"></div>
        </div>
      </div>

      <div class="controls">
        <button
          class="play-button"
          :style="{ backgroundColor: content?.playButtonColor }"
          @click="togglePlay"
          :disabled="!audioReady"
        >
          {{ isPlayingState ? '⏸' : '▶' }}
        </button>
        <button class="transcript-button" @click="toggleTranscript">
          <span>{{ transcriptVisible ? '▲' : '▼' }}</span>
          <span>{{ transcriptButtonText }}</span>
        </button>
        <div class="legend">
          <div class="legend-item">
            <div class="legend-dot" :style="{ backgroundColor: content?.agentColor }"></div>
            <span>{{ content?.agentLabel || 'Agent' }}</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" :style="{ backgroundColor: content?.customerColor }"></div>
            <span>{{ content?.customerLabel || 'Customer' }}</span>
          </div>
        </div>
      </div>

      <!-- Transcript Panel - Now inside the same card -->
      <div v-if="transcriptVisible" class="transcript-section">
        <div class="transcript-divider"></div>
        <h3 class="transcript-title" :style="{ color: content?.primaryTextColor }">
          {{ content?.transcriptTitle || 'Call Transcript' }}
        </h3>
        <div class="transcript-list" ref="transcriptListRef">
          <div
            v-for="(line, index) in processedTranscript"
            :key="index"
            class="transcript-item"
            :class="{ active: currentLineIndex === index }"
            @click="handleTranscriptClick(line, index)"
          >
            <div
              class="speaker-line"
              :style="{ backgroundColor: line.color }"
            ></div>
            <div class="transcript-text-container">
              <div class="transcript-time" :style="{ color: content?.secondaryTextColor }">
                {{ line.formattedTime }}
              </div>
              <p class="transcript-text" :style="{ color: content?.primaryTextColor }">
                {{ line.text }}
              </p>
            </div>
          </div>
        </div>

        <div v-if="content?.jumpToLineHint" class="info-text" :style="{ color: content?.secondaryTextColor }">
          {{ content.jumpToLineHint }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

export default {
  props: {
    uid: { type: String, required: true },
    content: { type: Object, required: true },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
  },
  setup(props, { emit }) {
    // Refs
    const audioRef = ref(null);
    const progressBarRef = ref(null);
    const transcriptListRef = ref(null);

    // State
    const isLoading = ref(true);
    const hasError = ref(false);
    const errorMessage = ref('');
    const audioReady = ref(false);
    const isPlayingState = ref(false);
    const currentTime = ref(0);
    const duration = ref(0);
    const currentSpeed = ref('1');
    const transcriptVisible = ref(false);
    const currentLineIndex = ref(0);
    const blobUrl = ref(null);

    // Internal Variables (MANDATORY for WeWeb)
    const { value: internalCurrentTime, setValue: setInternalCurrentTime } = wwLib.wwVariable.useComponentVariable({
      uid: props.uid,
      name: 'currentTime',
      type: 'number',
      defaultValue: 0,
    });

    const { value: internalDuration, setValue: setInternalDuration } = wwLib.wwVariable.useComponentVariable({
      uid: props.uid,
      name: 'duration',
      type: 'number',
      defaultValue: 0,
    });

    const { value: internalIsPlaying, setValue: setInternalIsPlaying } = wwLib.wwVariable.useComponentVariable({
      uid: props.uid,
      name: 'isPlaying',
      type: 'boolean',
      defaultValue: false,
    });

    const { value: internalProgress, setValue: setInternalProgress } = wwLib.wwVariable.useComponentVariable({
      uid: props.uid,
      name: 'progress',
      type: 'number',
      defaultValue: 0,
    });

    const { value: internalCurrentSpeaker, setValue: setInternalCurrentSpeaker } = wwLib.wwVariable.useComponentVariable({
      uid: props.uid,
      name: 'currentSpeaker',
      type: 'string',
      defaultValue: '',
    });

    // Process transcript with formula mapping
    const processedTranscript = computed(() => {
      const transcript = props.content?.transcript || [];
      if (!Array.isArray(transcript) || transcript.length === 0) return [];

      const { resolveMappingFormula } = wwLib.wwFormula.useFormula();

      return transcript.map((item, index) => {
        // Use formula mapping only if transcript is bound, otherwise use direct property access
        let time, duration, speaker, text;

        // Try formula mapping first (for bound data sources)
        const mappedTime = resolveMappingFormula(props.content?.transcriptTimeFormula, item);
        const mappedDuration = resolveMappingFormula(props.content?.transcriptDurationFormula, item);
        const mappedSpeaker = resolveMappingFormula(props.content?.transcriptSpeakerFormula, item);
        const mappedText = resolveMappingFormula(props.content?.transcriptTextFormula, item);

        // Use mapped values if they exist and are not null/undefined, otherwise fall back to direct access
        // Support both 'time' and 'start_time' field names for flexibility
        time = (mappedTime !== null && mappedTime !== undefined) ? mappedTime : (item?.time ?? item?.start_time ?? 0);
        duration = (mappedDuration !== null && mappedDuration !== undefined) ? mappedDuration : (item?.duration ?? 5);
        speaker = (mappedSpeaker !== null && mappedSpeaker !== undefined && mappedSpeaker !== '') ? mappedSpeaker : (item?.speaker ?? 'agent');
        text = (mappedText !== null && mappedText !== undefined && mappedText !== '') ? mappedText : (item?.text ?? '');

        const speakerColors = {
          agent: props.content?.agentColor || '#3b82f6',
          customer: props.content?.customerColor || '#10b981',
        };

        const timeValue = parseFloat(time) || 0;

        return {
          time: timeValue,
          duration: parseFloat(duration) || 5,
          speaker: String(speaker).toLowerCase(),
          text: String(text),
          color: speakerColors[String(speaker).toLowerCase()] || speakerColors.agent,
          formattedTime: formatTime(timeValue),
          originalItem: item,
        };
      }).sort((a, b) => a.time - b.time);
    });

    // Process segments for progress bar
    const processedSegments = computed(() => {
      const segments = processedTranscript.value;
      const totalDuration = duration.value || 1;
      const current = currentTime.value;

      return segments.map(segment => {
        const widthPercent = (segment.duration / totalDuration) * 100;
        const endTime = segment.time + segment.duration;
        const isPlayed = current >= segment.time;

        return {
          ...segment,
          widthPercent,
          endTime,
          isPlayed,
        };
      });
    });

    // Computed styles
    const containerStyle = computed(() => ({
      '--background-color': props.content?.backgroundColor || '#f9fafb',
      backgroundColor: props.content?.backgroundColor || '#f9fafb',
    }));

    const cardStyle = computed(() => ({
      '--card-background': props.content?.cardBackgroundColor || '#ffffff',
      '--border-radius': props.content?.cardBorderRadius || '8px',
      '--primary-text': props.content?.primaryTextColor || '#111827',
      '--secondary-text': props.content?.secondaryTextColor || '#6b7280',
      '--progress-bg': props.content?.progressBarBackground || '#e5e7eb',
      backgroundColor: props.content?.cardBackgroundColor || '#ffffff',
      borderRadius: props.content?.cardBorderRadius || '8px',
      borderWidth: props.content?.cardBorderWidth || '1px',
      borderStyle: props.content?.cardBorderStyle || 'solid',
      borderColor: props.content?.cardBorderColor || '#e5e7eb',
      boxShadow: props.content?.cardShadow || '0 1px 3px rgba(0,0,0,0.1)',
    }));

    const progressPercent = computed(() => {
      if (!duration.value) return 0;
      return (currentTime.value / duration.value) * 100;
    });

    const formattedCurrentTime = computed(() => formatTime(currentTime.value));
    const formattedDuration = computed(() => formatTime(duration.value));

    const transcriptButtonText = computed(() => {
      return transcriptVisible.value
        ? (props.content?.hideTranscriptText || 'Hide Transcript')
        : (props.content?.showTranscriptText || 'Show Transcript');
    });

    // Format time helper
    function formatTime(time) {
      if (isNaN(time) || !isFinite(time)) return '0:00';
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Audio event handlers
    function handleLoadedMetadata() {
      if (!audioRef.value) return;
      duration.value = audioRef.value.duration;
      setInternalDuration(audioRef.value.duration);
      isLoading.value = false;
      audioReady.value = true;
    }

    function handleCanPlay() {
      isLoading.value = false;
      audioReady.value = true;

      // Auto-play if enabled
      if (props.content?.autoPlay && !isPlayingState.value) {
        togglePlay();
      }
    }

    function handleAudioError(e) {
      console.error('Audio Error:', e);
      hasError.value = true;
      errorMessage.value = '⚠️ Error loading audio file. Please check the URL.';
      isLoading.value = false;
      audioReady.value = false;
    }

    function handleTimeUpdate() {
      if (!audioRef.value) return;

      currentTime.value = audioRef.value.currentTime;
      setInternalCurrentTime(audioRef.value.currentTime);

      const progress = duration.value ? (currentTime.value / duration.value) * 100 : 0;
      setInternalProgress(progress);

      // Update current line
      updateCurrentLine();

      // Emit time update event (throttled)
      if (!handleTimeUpdate.lastEmit || Date.now() - handleTimeUpdate.lastEmit > 500) {
        emit('trigger-event', {
          name: 'time-update',
          event: {
            currentTime: currentTime.value,
            duration: duration.value,
            progress: progress,
          }
        });
        handleTimeUpdate.lastEmit = Date.now();
      }
    }

    function handleEnded() {
      isPlayingState.value = false;
      setInternalIsPlaying(false);
      emit('trigger-event', { name: 'ended', event: {} });
    }

    function handlePlay() {
      isPlayingState.value = true;
      setInternalIsPlaying(true);
      emit('trigger-event', {
        name: 'play',
        event: { currentTime: currentTime.value }
      });
    }

    function handlePause() {
      isPlayingState.value = false;
      setInternalIsPlaying(false);
      emit('trigger-event', {
        name: 'pause',
        event: { currentTime: currentTime.value }
      });
    }

    // Controls
    function togglePlay() {
      if (!audioRef.value || !audioReady.value) return;

      if (isPlayingState.value) {
        audioRef.value.pause();
      } else {
        audioRef.value.play().catch(err => {
          console.error('Playback error:', err);
          hasError.value = true;
          errorMessage.value = '⚠️ Error playing audio. The audio file could not be loaded.';
        });
      }
    }

    function handleProgressClick(e) {
      if (!audioRef.value || !progressBarRef.value) return;

      const rect = progressBarRef.value.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      audioRef.value.currentTime = percent * duration.value;
    }

    function handleSpeedChange() {
      if (!audioRef.value) return;
      const speed = parseFloat(currentSpeed.value);
      audioRef.value.playbackRate = speed;

      emit('trigger-event', {
        name: 'speed-change',
        event: { speed }
      });
    }

    function toggleTranscript() {
      transcriptVisible.value = !transcriptVisible.value;

      emit('trigger-event', {
        name: 'transcript-toggle',
        event: { isVisible: transcriptVisible.value }
      });
    }

    function handleTranscriptClick(line, index) {
      if (!audioRef.value) return;

      audioRef.value.currentTime = line.time;

      if (!isPlayingState.value) {
        togglePlay();
      }

      emit('trigger-event', {
        name: 'transcript-click',
        event: {
          time: line.time,
          speaker: line.speaker,
          text: line.text,
        }
      });
    }

    function updateCurrentLine() {
      const transcript = processedTranscript.value;
      for (let i = transcript.length - 1; i >= 0; i--) {
        if (currentTime.value >= transcript[i].time) {
          if (currentLineIndex.value !== i) {
            currentLineIndex.value = i;
            setInternalCurrentSpeaker(transcript[i].speaker);

            // Auto-scroll transcript
            if (transcriptVisible.value && transcriptListRef.value) {
              const items = transcriptListRef.value.querySelectorAll('.transcript-item');
              if (items[i]) {
                items[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }
          break;
        }
      }
    }

    // Convert binary string to Blob URL
    function createBlobUrlFromBinaryString(binaryString) {
      if (!binaryString) return null;

      try {
        // Clean up old blob URL if it exists
        if (blobUrl.value) {
          URL.revokeObjectURL(blobUrl.value);
          blobUrl.value = null;
        }

        // Check if it's base64-encoded (starts with data:audio or is pure base64)
        let audioData;

        if (binaryString.startsWith('data:audio')) {
          // It's already a data URL, use it directly
          return binaryString;
        } else if (binaryString.startsWith('data:')) {
          // It's a data URL but not audio - try to use it anyway
          return binaryString;
        } else {
          // Try to decode as base64
          try {
            const base64Data = binaryString.replace(/^data:audio\/[a-z]+;base64,/, '');
            const binaryData = atob(base64Data);
            const arrayBuffer = new Uint8Array(binaryData.length);
            for (let i = 0; i < binaryData.length; i++) {
              arrayBuffer[i] = binaryData.charCodeAt(i);
            }
            audioData = arrayBuffer;
          } catch (e) {
            // If base64 decode fails, treat as raw binary string
            const arrayBuffer = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              arrayBuffer[i] = binaryString.charCodeAt(i);
            }
            audioData = arrayBuffer;
          }
        }

        // Create blob and URL if we have array buffer data
        if (audioData instanceof Uint8Array) {
          const blob = new Blob([audioData], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          blobUrl.value = url;
          return url;
        }

        return null;
      } catch (error) {
        console.error('Error creating blob URL from binary string:', error);
        return null;
      }
    }

    // Load audio from either URL or binary string
    function loadAudio() {
      if (!audioRef.value) return;

      hasError.value = false;
      errorMessage.value = '';
      isLoading.value = true;
      audioReady.value = false;
      isPlayingState.value = false;
      currentTime.value = 0;

      // Priority: audioUrl first, then audioBinaryString
      const url = props.content?.audioUrl;
      const binaryString = props.content?.audioBinaryString;

      if (url) {
        // Use direct URL
        audioRef.value.src = url;
        audioRef.value.load();
      } else if (binaryString) {
        // Convert binary string to blob URL
        const audioSrc = createBlobUrlFromBinaryString(binaryString);
        if (audioSrc) {
          audioRef.value.src = audioSrc;
          audioRef.value.load();
        } else {
          hasError.value = true;
          errorMessage.value = '⚠️ Error processing audio binary data.';
          isLoading.value = false;
        }
      } else {
        // No audio source provided
        isLoading.value = false;
      }
    }

    // Watch for audio URL or binary string changes
    watch(() => [props.content?.audioUrl, props.content?.audioBinaryString], () => {
      loadAudio();
    }, { immediate: true });

    // Watch for initial speed changes
    watch(() => props.content?.initialSpeed, (newSpeed) => {
      if (newSpeed && audioRef.value) {
        currentSpeed.value = newSpeed;
        audioRef.value.playbackRate = parseFloat(newSpeed);
      }
    }, { immediate: true });

    // Watch for showTranscriptByDefault
    watch(() => props.content?.showTranscriptByDefault, (shouldShow) => {
      if (shouldShow !== undefined) {
        transcriptVisible.value = shouldShow;
      }
    }, { immediate: true });

    // Watch all style properties for reactive updates
    watch(() => [
      props.content?.agentColor,
      props.content?.customerColor,
      props.content?.backgroundColor,
      props.content?.cardBackgroundColor,
      props.content?.cardBorderRadius,
      props.content?.cardBorderWidth,
      props.content?.cardBorderColor,
      props.content?.cardBorderStyle,
      props.content?.cardShadow,
      props.content?.primaryTextColor,
      props.content?.secondaryTextColor,
      props.content?.playButtonColor,
      props.content?.progressBarBackground,
    ], () => {
      // Styles are handled by computed properties automatically
    }, { deep: true });

    // Cleanup
    onUnmounted(() => {
      if (audioRef.value) {
        audioRef.value.pause();
        audioRef.value.src = '';
      }
      // Clean up blob URL if it exists
      if (blobUrl.value) {
        URL.revokeObjectURL(blobUrl.value);
        blobUrl.value = null;
      }
    });

    return {
      audioRef,
      progressBarRef,
      transcriptListRef,
      isLoading,
      hasError,
      errorMessage,
      audioReady,
      isPlayingState,
      currentSpeed,
      transcriptVisible,
      currentLineIndex,
      processedTranscript,
      processedSegments,
      containerStyle,
      cardStyle,
      progressPercent,
      formattedCurrentTime,
      formattedDuration,
      transcriptButtonText,
      togglePlay,
      handleProgressClick,
      handleSpeedChange,
      toggleTranscript,
      handleTranscriptClick,
      handleLoadedMetadata,
      handleCanPlay,
      handleAudioError,
      handleTimeUpdate,
      handleEnded,
      handlePlay,
      handlePause,
    };
  },
};
</script>

<style lang="scss" scoped>
.call-recording-player {
  width: 100%;
  min-height: 200px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 20px;
  background-color: var(--background-color, #f9fafb);

  * {
    box-sizing: border-box;
  }
}

.card {
  background: var(--card-background, white);
  border-radius: var(--border-radius, 8px);
  padding: 24px;
  // Border and shadow now controlled by inline styles via cardStyle
}

.alert {
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
}

.alert-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.alert-info {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
}

.time-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 16px;
  flex-wrap: wrap;
}

.time-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--primary-text, #374151);
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.speed-label {
  font-size: 14px;
  color: var(--secondary-text, #6b7280);
}

.speed-select {
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  cursor: pointer;
  background: white;
}

.speed-select:focus {
  box-shadow: 0 0 0 2px #3b82f6;
}

.progress-container {
  margin-bottom: 16px;
  position: relative;
}

.progress-bar {
  position: relative;
  width: 100%;
  height: 8px;
  background: var(--progress-bg, #e5e7eb);
  border-radius: 9999px;
  cursor: pointer;
  overflow: hidden;
}

.segments-background {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
}

.speaker-segment {
  height: 100%;
  opacity: 0.25;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.speaker-segment.played {
  opacity: 1;
}

.progress-overlay {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.1) 0%, transparent 100%);
  pointer-events: none;
  transition: width 0.1s linear;
}

.progress-indicator {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  pointer-events: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: left 0.1s linear;
}

.controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.play-button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #111827;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 20px;
  flex-shrink: 0;
}

.play-button:hover:not(:disabled) {
  background: #1f2937;
}

.play-button:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.transcript-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  background: #f3f4f6;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.transcript-button:hover {
  background: #e5e7eb;
}

.legend {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
  font-size: 12px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

// Transcript section - now inside the same card
.transcript-section {
  margin-top: 24px;
}

.transcript-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #e5e7eb 20%, #e5e7eb 80%, transparent 100%);
  margin-bottom: 24px;
}

.transcript-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--primary-text, #111827);
  margin-bottom: 16px;
}

.transcript-list {
  max-height: 384px;
  overflow-y: auto;
  padding-right: 8px;
}

.transcript-list::-webkit-scrollbar {
  width: 8px;
}

.transcript-list::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 4px;
}

.transcript-list::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.transcript-list::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.transcript-item {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #f3f4f6;
  margin-bottom: 8px;
  display: flex;
  gap: 12px;
}

.transcript-item:hover {
  background: #f9fafb;
}

.transcript-item.active {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.speaker-line {
  width: 4px;
  flex-shrink: 0;
  border-radius: 9999px;
}

.transcript-text-container {
  flex: 1;
  min-width: 0;
}

.transcript-time {
  font-size: 12px;
  font-family: monospace;
  color: var(--secondary-text, #6b7280);
  margin-bottom: 4px;
}

.transcript-text {
  font-size: 14px;
  color: var(--primary-text, #1f2937);
  line-height: 1.5;
  margin: 0;
  word-wrap: break-word;
}

.info-text {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  color: var(--secondary-text, #6b7280);
}

// Responsive design
@media (max-width: 768px) {
  .call-recording-player {
    padding: 12px;
  }

  .card {
    padding: 16px;
  }

  .time-display {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .legend {
    margin-left: 0;
    width: 100%;
  }

  .controls {
    flex-wrap: wrap;
  }

  .transcript-list {
    max-height: 300px;
  }
}

@media (max-width: 480px) {
  .time-text {
    font-size: 12px;
  }

  .speed-label,
  .speed-select {
    font-size: 12px;
  }

  .play-button {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }

  .transcript-button {
    font-size: 12px;
    padding: 6px 12px;
  }

  .legend {
    font-size: 11px;
  }
}
</style>
