import iceServers from './iceServers'
import peers from './peers'
import handleMessage from './handleMessage'

import updatePlayer from '../updatePlayer'
import handleChannelClosed from './handleChannelClosed'

export default (socket) => {
  // handle ice candidate from remote
  socket.on('ice candidate', async ({ from, candidate }) => {
    console.debug(`received ice candidate from ${from}`)
    await peers[from].connection.addIceCandidate(candidate)
  })

  // Handlers when initiating connection
  socket.on('answer', async ({ from, answer }) => {
    console.debug(`received answer from ${from}`)
    await peers[from].connection.setRemoteDescription(answer)
  })

  socket.on('new peer', async ({ id: peerId }) => {
    console.debug(`discovered new peer: ${peerId}`)
    const connection = new RTCPeerConnection({ iceServers })
    window.onbeforeunload = () => {
      channel.close()
      return null
    }

    const channel = connection.createDataChannel('dataChannel')
    console.debug(`creating new channel to ${peerId}`)

    peers[peerId] = { id: peerId, connection, channel }

    channel.onmessage = ({ data }) => handleMessage(peers[peerId], JSON.parse(data))

    channel.onopen = () => {
      console.debug(`channel to ${peerId} opened`)
      updatePlayer()
    }

    channel.onclose = handleChannelClosed(peerId)

    connection.onicecandidate = ({ candidate }) => {
      if (candidate) {
        console.debug(`sending ice candidate to ${peerId}`)
        socket.emit('ice candidate', {
          to: peerId,
          candidate,
        })
      } else {
        console.debug(`finished ice candidate search for ${peerId}`)
      }
    }

    const offer = await connection.createOffer()
    await connection.setLocalDescription(offer)

    console.debug(`sending offer to ${peerId}`)
    socket.emit('offer', { to: peerId, offer })
  })

  // handlers for reacting to connection initiation
  socket.on('offer', async ({ from, offer }) => {
    console.debug(`received offer from ${from}`)
    const connection = new RTCPeerConnection({ iceServers })

    peers[from] = { id: from, connection }

    // handle datachannel from remote
    connection.ondatachannel = ({ channel }) => {
      window.onbeforeunload = () => {
        console.log('onbeforeunload')
        channel.close()
        return null
      }
      console.debug(`received data channel from ${from}`)
      peers[from].channel = channel
      channel.onmessage = ({ data }) => handleMessage({ id: from }, JSON.parse(data))

      // handle opening of datachannel after ice negotiation
      channel.onopen = () => {
        console.debug(`channel to ${from} opened`)
        peers[from] = { channel }
        updatePlayer()
      }

      channel.onclose = handleChannelClosed(from)
    }

    // send found ice candidate to remote
    // null means candidate search concluded
    connection.onicecandidate = ({ candidate }) => {
      if (candidate) {
        console.debug(`sending ice candidate to ${from}`)
        socket.emit('ice candidate', {
          to: from,
          candidate,
        })
      } else {
        console.debug(`finished ice candidate search for ${from}`)
      }
    }

    // setup our connection to new peer with descriptions
    await connection.setRemoteDescription(offer)
    const answer = await connection.createAnswer()
    await connection.setLocalDescription(answer)

    // send generated answer to new peer
    socket.emit('answer', { to: from, answer })
  })

}
