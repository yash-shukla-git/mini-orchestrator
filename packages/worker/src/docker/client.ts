import Dockerode from 'dockerode';

// Connects via the Docker socket. On Linux/Mac this is /var/run/docker.sock.
// When running inside Docker (docker-compose), the socket is mounted in.
export const docker = new Dockerode();
