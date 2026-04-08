<script lang="ts">
	import { page } from '$app/state';
	import Go2RTCPlayer from '$lib/components/Go2RTCPlayer.svelte';
	import { io } from 'socket.io-client';
	import { onMount } from 'svelte';

	onMount(() => {
		const socket = io('http://localhost:3000', {
			path: '/mqtt',
			transports: ['websocket']
		});

		socket.on('connect', () => {
			console.log('Connected:', socket.id);
		});

		socket.on('mqtt.report', (data) => {
			console.log('Received MQTT message:', data);
		});
	});
</script>

<Go2RTCPlayer url={`ws://${page.url.host}/api/go2rtc?src=22E8AJ581300307`} />
