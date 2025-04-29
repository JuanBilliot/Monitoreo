                  <Box 
                    sx={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      backgroundColor: stats.packetsSent > 0 && ((stats.packetsSent - stats.packetsReceived) > 10) ? 'rgba(255, 85, 85, 0.1)' : 'rgba(255, 121, 198, 0.1)',
                      boxShadow: stats.packetsSent > 0 && ((stats.packetsSent - stats.packetsReceived) > 10) ? '0 0 10px rgba(255, 85, 85, 0.2)' : '0 0 10px rgba(255, 121, 198, 0.2)'
                    }}
                  >
                    <ErrorOutlineIcon sx={{ 
                      fontSize: '20px', 
                      color: stats.packetsSent > 0 && ((stats.packetsSent - stats.packetsReceived) > 10) ? '#ff5555' : '#ff79c6' 
                    }} />
                  </Box>
