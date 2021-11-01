import React from 'react';
import Visualizer from './Visualizer';

const getMedia = async (clientDevice) => {
    const ad = await navigator.mediaDevices.enumerateDevices()
        .then((devices) => !!(clientDevice !== null && devices.find(d => d.deviceId === clientDevice))
            ? clientDevice
            : null)
    if (ad) {
        try {
            return await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: { exact: ad } },
                video: false,
            })
        } catch (err) {
            console.log('Error:', err)
        }
    } else {
        try {
            return await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
            })
        } catch (err) {
            console.log('Error:', err)
        }
    }
};

const AudioDataContainer = (props) => {
    const [audioData, setAudioData] = React.useState(null);
    const audioContextRef = React.useRef(new AudioContext());
    const theGainRef = React.useRef(null);
    const theStreamRef = React.useRef(null);

    const initializeAudioAnalyser = React.useCallback(() => {
        getMedia(props.audioDeviceId).then(stream => {
            theStreamRef.current = stream
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                return
            }
            const source = audioContextRef.current.createMediaStreamSource(stream);
            const analyser = audioContextRef.current.createAnalyser();            
            analyser.fftSize = props.fft;
            const gain = audioContextRef.current.createGain()
            theGainRef.current = gain.gain
            source.connect(gain)
            gain.connect(analyser)
            setAudioData(analyser)
        })
    }, [props.fft, props.audioDeviceId]);

    const getFrequencyData = React.useCallback((styleAdjuster) => {
        const bufferLength = audioData && audioData.frequencyBinCount;
        const amplitudeArray = new Uint8Array(bufferLength);
        audioData && audioData.getByteFrequencyData(amplitudeArray)
        styleAdjuster(amplitudeArray)
    }, [audioData]);

    const frequencyBandArray = React.useMemo(() => [...Array(props.bandCount).keys()], [props.bandCount])

    return (
        <div style={{ height: 255, position: 'relative' }}>
            <Visualizer
                fft={props.fft}
                bandCount={props.bandCount}
                key={props.bandCount}
                initializeAudioAnalyser={initializeAudioAnalyser}
                audioContext={audioContextRef.current} // should be okay as a ref if the context never updates
                frequencyBandArray={frequencyBandArray}
                getFrequencyData={getFrequencyData}
                refresh={() => {
                    if (audioContextRef.current && audioContextRef.current.state === 'running') {
                        audioContextRef.current.state !== 'closed' && theStreamRef.current && theStreamRef.current.getTracks().forEach(track => track.stop())
                        audioContextRef.current && audioContextRef.current.state !== 'closed' && audioContextRef.current.suspend()
                        audioContextRef.current && audioContextRef.current.state !== 'closed' && audioContextRef.current.resume()
                        setAudioData(null);
                    }
                }}
                stop={() => {
                    if (audioContextRef.current && audioContextRef.current.state === 'running') {
                        if (theGainRef.current) {
                            theGainRef.current.value = 0
                        }
                        setTimeout(() => {
                            audioContextRef.current.state !== 'closed' && theStreamRef.current && theStreamRef.current.getTracks().forEach(track => track.stop())
                            audioContextRef.current && audioContextRef.current.state !== 'closed' && audioContextRef.current.suspend()
                            audioContextRef.current && audioContextRef.current.state !== 'closed' && audioContextRef.current.resume()
                            setAudioData(null)
                        }, 800)
                    }
                }}
            />
        </div>
    );
}

export default AudioDataContainer;
