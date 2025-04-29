                  <Box>
                    <Typography variant="caption" sx={{ color: '#8892b0', display: 'block' }}>
                      Paquetes Perdidos
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: stats.packetsSent > 0 && ((stats.packetsSent - stats.packetsReceived) > 10) ? '#ff5555' : '#ccd6f6', 
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {stats.packetsSent > 0 ? (stats.packetsSent - stats.packetsReceived) : 0} paquetes
                      {stats.packetsSent > 0 && ((stats.packetsSent - stats.packetsReceived) > 10) && (
                        <span style={{ 
                          fontSize: '10px', 
                          color: '#ff5555', 
                          marginLeft: '5px',
                          padding: '2px 5px',
                          backgroundColor: 'rgba(255, 85, 85, 0.1)',
                          borderRadius: '4px'
                        }}>
                          Alerta
                        </span>
                      )}
                    </Typography>
                  </Box>
