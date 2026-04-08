<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	interface Props {
		url: string;
		mode?: string;
		activeMode?: string;
	}

	// eslint-disable-next-line no-useless-assignment
	let { url, mode = 'webrtc,mse', activeMode = $bindable('negotiating') }: Props = $props();

	const CODECS = [
		'avc1.640029',
		'avc1.64002A',
		'avc1.640033',
		'hvc1.1.6.L153.B0',
		'mp4a.40.2',
		'mp4a.40.5',
		'flac',
		'opus'
	];

	function supportedCodecs(isSupported: (type: string) => boolean) {
		return CODECS.filter((c) => isSupported(`video/mp4; codecs="${c}"`)).join();
	}

	let videoEl: HTMLVideoElement;
	let ws: WebSocket | null = null;
	let pc: RTCPeerConnection | null = null;
	let mseCodecs = '';

	onMount(() => {
		ws = new WebSocket(url);
		ws.binaryType = 'arraybuffer';

		let ondata: ((data: ArrayBuffer) => void) | null = null;
		const onmessage: Record<string, (msg: { type: string; value: string }) => void> = {};

		ws.addEventListener('open', () => {
			ws!.addEventListener('message', (ev) => {
				if (typeof ev.data === 'string') {
					const msg = JSON.parse(ev.data);
					for (const handler of Object.values(onmessage)) {
						handler(msg);
					}
				} else if (ondata) {
					ondata(ev.data);
				}
			});

			if (mode.includes('mse') && ('MediaSource' in window || 'ManagedMediaSource' in window)) {
				setupMSE(onmessage, (handler) => (ondata = handler));
			}

			if (mode.includes('webrtc') && 'RTCPeerConnection' in window) {
				setupWebRTC(onmessage);
			}
		});

		ws.addEventListener('close', () => {
			console.log('go2rtc WebSocket closed');
		});
	});

	function setupMSE(
		onmessage: Record<string, (msg: { type: string; value: string }) => void>,
		setOnData: (handler: (data: ArrayBuffer) => void) => void
	) {
		let ms: MediaSource;

		if ('ManagedMediaSource' in window) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			ms = new (window as any).ManagedMediaSource();
			videoEl.disableRemotePlayback = true;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(videoEl as any).srcObject = ms;
		} else {
			ms = new MediaSource();
			videoEl.src = URL.createObjectURL(ms);
		}

		ms.addEventListener(
			'sourceopen',
			() => {
				if (!('ManagedMediaSource' in window)) {
					URL.revokeObjectURL(videoEl.src);
				}
				ws!.send(
					JSON.stringify({ type: 'mse', value: supportedCodecs(MediaSource.isTypeSupported) })
				);
			},
			{ once: true }
		);

		videoEl.play().catch(() => {
			videoEl.muted = true;
			videoEl.play().catch(console.warn);
		});

		onmessage['mse'] = (msg) => {
			if (msg.type !== 'mse') return;

			mseCodecs = msg.value;
			if (!pc) activeMode = 'mse';

			const sb = ms.addSourceBuffer(msg.value);
			sb.mode = 'segments';

			const buf = new Uint8Array(2 * 1024 * 1024);
			let bufLen = 0;

			sb.addEventListener('updateend', () => {
				if (!sb.updating && bufLen > 0) {
					try {
						sb.appendBuffer(buf.slice(0, bufLen));
						bufLen = 0;
					} catch {
						/* buffer full */
					}
				}

				if (!sb.updating && sb.buffered?.length) {
					const end = sb.buffered.end(sb.buffered.length - 1);
					const start = end - 5;
					const start0 = sb.buffered.start(0);
					if (start > start0) {
						sb.remove(start0, start);
						ms.setLiveSeekableRange(start, end);
					}
					if (videoEl.currentTime < start) {
						videoEl.currentTime = start;
					}
					videoEl.playbackRate = Math.max(end - videoEl.currentTime, 0.1);
				}
			});

			setOnData((data) => {
				if (sb.updating || bufLen > 0) {
					const b = new Uint8Array(data);
					buf.set(b, bufLen);
					bufLen += b.byteLength;
				} else {
					try {
						sb.appendBuffer(data);
					} catch {
						/* buffer full */
					}
				}
			});
		};
	}

	function setupWebRTC(onmessage: Record<string, (msg: { type: string; value: string }) => void>) {
		pc = new RTCPeerConnection({
			bundlePolicy: 'max-bundle',
			iceServers: [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }]
		});

		pc.addEventListener('icecandidate', (ev) => {
			const candidate = ev.candidate ? ev.candidate.toJSON().candidate : '';
			ws!.send(JSON.stringify({ type: 'webrtc/candidate', value: candidate }));
		});

		pc.addEventListener('connectionstatechange', () => {
			if (pc?.connectionState === 'connected') {
				const tracks = pc
					.getTransceivers()
					.filter((tr) => tr.currentDirection === 'recvonly')
					.map((tr) => tr.receiver.track);

				const video2 = document.createElement('video');
				video2.addEventListener(
					'loadeddata',
					() => {
						if (!pc) return;

						let rtcPriority = 0;
						let msePriority = 0;

						const stream = video2.srcObject as MediaStream;
						if (stream.getVideoTracks().length > 0) {
							const isH265 = pc.remoteDescription?.sdp?.includes('H265/90000');
							rtcPriority += isH265 ? 0x240 : 0x220;
						}
						if (stream.getAudioTracks().length > 0) rtcPriority += 0x102;

						if (mseCodecs.includes('hvc1.')) msePriority += 0x230;
						if (mseCodecs.includes('avc1.')) msePriority += 0x210;
						if (mseCodecs.includes('mp4a.')) msePriority += 0x101;

						if (rtcPriority >= msePriority) {
							videoEl.srcObject = stream;
							videoEl.play().catch(() => {
								videoEl.muted = true;
								videoEl.play().catch(console.warn);
							});

							activeMode = 'webrtc';

							// WebRTC won — close the WebSocket (MSE not needed)
							if (ws) {
								ws.close();
								ws = null;
							}
						} else {
							// MSE won — close WebRTC
							activeMode = 'mse';
							pc?.close();
							pc = null;
						}

						video2.srcObject = null;
					},
					{ once: true }
				);
				video2.srcObject = new MediaStream(tracks);
			} else if (pc?.connectionState === 'failed' || pc?.connectionState === 'disconnected') {
				pc.close();
				pc = null;
			}
		});

		onmessage['webrtc'] = (msg) => {
			switch (msg.type) {
				case 'webrtc/candidate':
					pc?.addIceCandidate({ candidate: msg.value, sdpMid: '0' }).catch(console.warn);
					break;
				case 'webrtc/answer':
					pc?.setRemoteDescription({ type: 'answer', sdp: msg.value }).catch(console.warn);
					break;
				case 'error':
					if (msg.value.includes('webrtc/offer')) pc?.close();
					break;
			}
		};

		// Create and send offer
		pc.addTransceiver('video', { direction: 'recvonly' });
		pc.addTransceiver('audio', { direction: 'recvonly' });
		pc.createOffer().then(async (offer) => {
			await pc!.setLocalDescription(offer);
			ws!.send(JSON.stringify({ type: 'webrtc/offer', value: offer.sdp }));
		});
	}

	onDestroy(() => {
		if (ws) {
			ws.close();
			ws = null;
		}
		if (pc) {
			pc.close();
			pc = null;
		}
	});
</script>

<video bind:this={videoEl} autoplay muted></video>
