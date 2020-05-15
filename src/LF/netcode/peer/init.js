import iceServers from '../iceServers'
import channels from '../channels'
import handleMessage from '../handleMessage'
import updatePlayer from '../../updatePlayer'

export default (id, socket) => {
  const connection = new RTCPeerConnection({ iceServers })

  connection.ondatachannel = ({ channel }) => {
    console.debug('open channel to lead')
    channel.onmessage = ({ data }) => handleMessage({ id: 'lead' }, JSON.parse(data))

    channel.onopen = () => {
      channels.push(channel)
      updatePlayer()
    }
  }

  socket.on('ice candidate',
    async (evt) => connection.addIceCandidate(evt.candidate),
  )
  connection.onicecandidate = ({ candidate }) => {
    if (candidate) {
      socket.emit('ice candidate', { candidate })
    }
  }

  socket.on('description', async ({ offer }) => {
    await connection.setRemoteDescription(offer)
    const answer = await connection.createAnswer()
    await connection.setLocalDescription(answer)
    socket.emit('description', { answer })
  })
}
