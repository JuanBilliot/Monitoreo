import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  useTheme,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Dns as DnsIcon,
  Security as SecurityIcon,
  Waves as WavesIcon,
} from '@mui/icons-material';

const Welcome = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [showButton, setShowButton] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);

  useEffect(() => {
    // Mostrar el botón después de un retraso
    const timer = setTimeout(() => {
      setShowButton(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Animación para el título
  const titleVariants = {
    hidden: { opacity: 0, y: -50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      }
    }
  };

  // Animación para el subtítulo
  const subtitleVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        delay: 0.5,
        ease: "easeOut",
      }
    }
  };

  // Animación para los iconos
  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: (i) => ({
      scale: 1,
      rotate: 0,
      transition: {
        duration: 0.6,
        delay: 0.8 + (i * 0.2),
        type: "spring",
        stiffness: 100
      }
    })
  };

  // Animación para el botón
  const buttonVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: 2.5,
        ease: "easeOut"
      }
    },
    hover: {
      scale: 1.05,
      boxShadow: "0px 5px 15px rgba(100, 255, 218, 0.4)",
      transition: {
        duration: 0.3,
        ease: "easeInOut"
      }
    },
    tap: {
      scale: 0.95,
      transition: {
        duration: 0.1
      }
    }
  };

  // Animación para el logo
  const logoVariants = {
    initial: { 
      scale: 1,
      rotate: 0,
    },
    hover: { 
      scale: 1.1,
      rotate: 5,
      transition: { 
        duration: 0.3,
        yoyo: Infinity,
        ease: "easeInOut" 
      }
    }
  };

  // Animación para las letras del título
  const letterVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: 1.2 + (i * 0.1),
        ease: "easeOut"
      }
    }),
    hover: (i) => ({
      y: [0, -10, 0],
      color: ['#64FFDA', '#00C851', '#64FFDA'],
      transition: {
        duration: 0.5,
        delay: i * 0.06,
        repeat: Infinity,
        repeatDelay: 1.5
      }
    })
  };

  // Características del sistema
  const features = [
    {
      icon: <SpeedIcon sx={{ fontSize: 60 }} />,
      title: "Monitoreo en Tiempo Real",
      description: "Visualiza el rendimiento de tus servidores con actualizaciones instantáneas."
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 60 }} />,
      title: "Alertas Inteligentes",
      description: "Recibe notificaciones cuando tus servidores necesiten atención."
    },
    {
      icon: <StorageIcon sx={{ fontSize: 60 }} />,
      title: "Gestión de Recursos",
      description: "Controla el uso de CPU, memoria y almacenamiento de forma eficiente."
    }
  ];

  // Efecto de partículas para el fondo
  const ParticleBackground = () => {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          zIndex: 0,
          opacity: 0.4,
        }}
      >
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              scale: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              x: [
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth,
              ],
              y: [
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight,
              ],
              transition: {
                duration: Math.random() * 60 + 60,
                repeat: Infinity,
                ease: "linear",
              },
            }}
            style={{
              position: 'absolute',
              width: Math.random() * 4 + 1,
              height: Math.random() * 4 + 1,
              borderRadius: '50%',
              backgroundColor: '#64FFDA',
            }}
          />
        ))}
      </Box>
    );
  };

  // Logo animado personalizado para NetFlow
  const AnimatedLogo = () => {
    return (
      <motion.div
        initial="initial"
        whileHover="hover"
        animate={logoHovered ? "hover" : "initial"}
        variants={logoVariants}
        onHoverStart={() => setLogoHovered(true)}
        onHoverEnd={() => setLogoHovered(false)}
        style={{
          position: 'relative',
          width: 60,
          height: 60,
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #112240, #0A192F)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 4px 15px rgba(100, 255, 218, 0.3)',
          border: '2px solid rgba(100, 255, 218, 0.5)',
          overflow: 'hidden',
          marginRight: '12px',
        }}
      >
        <motion.div
          animate={{
            y: [-2, 2, -2],
            transition: {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
        >
          <WavesIcon sx={{ fontSize: 32, color: '#64FFDA' }} />
        </motion.div>
        <motion.div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            background: 'linear-gradient(to bottom, transparent, rgba(100, 255, 218, 0.1), transparent)',
            transform: 'translateY(-100%)',
          }}
          animate={{
            y: ['100%', '-100%'],
            transition: {
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }
          }}
        />
      </motion.div>
    );
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0A192F 0%, #112240 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <ParticleBackground />
      
      {/* Logo flotante */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        style={{
          position: 'absolute',
          top: '2rem',
          left: '2rem',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <AnimatedLogo />
        <Typography 
          variant="h5" 
          component="div" 
          sx={{ 
            fontWeight: 'bold',
            color: '#E6F1FF',
            letterSpacing: '1px',
          }}
        >
          <motion.span
            animate={{
              color: ['#E6F1FF', '#64FFDA', '#E6F1FF'],
              transition: { duration: 3, repeat: Infinity }
            }}
          >
            Net
          </motion.span>
          <motion.span
            animate={{
              color: ['#64FFDA', '#E6F1FF', '#64FFDA'],
              transition: { duration: 3, repeat: Infinity }
            }}
          >
            Flow
          </motion.span>
        </Typography>
      </motion.div>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: 8 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '80vh',
            textAlign: 'center',
          }}
        >
          <motion.div
            variants={titleVariants}
            initial="hidden"
            animate="visible"
          >
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              {"NetFlow".split('').map((letter, i) => (
                <motion.div
                  key={i}
                  custom={i}
                  variants={letterVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  style={{ display: 'inline-block' }}
                >
                  <Typography
                    variant="h1"
                    component="span"
                    sx={{
                      fontSize: { xs: '2.5rem', md: '4.5rem' },
                      fontWeight: 800,
                      display: 'inline-block',
                      mx: letter === ' ' ? 2 : 0,
                      color: '#64FFDA',
                      textShadow: '0 0 20px rgba(100, 255, 218, 0.3)',
                    }}
                  >
                    {letter}
                  </Typography>
                </motion.div>
              ))}
            </Box>
          </motion.div>

          <motion.div
            variants={subtitleVariants}
            initial="hidden"
            animate="visible"
          >
            <Typography
              variant="h5"
              sx={{
                color: '#8892B0',
                mb: 6,
                maxWidth: '800px',
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              Plataforma avanzada para supervisar y gestionar el rendimiento de tus servidores
              en tiempo real con analíticas detalladas y alertas inteligentes.
            </Typography>
          </motion.div>

          <Grid container spacing={4} sx={{ mb: 8 }} justifyContent="center">
            {features.map((feature, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <motion.div
                  custom={i}
                  variants={iconVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      p: 3,
                      height: '100%',
                      borderRadius: 4,
                      background: 'rgba(10, 25, 47, 0.6)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(100, 255, 218, 0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-10px)',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(100, 255, 218, 0.3)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        color: '#64FFDA',
                        mb: 2,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        background: 'rgba(100, 255, 218, 0.1)',
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        color: '#E6F1FF',
                        fontWeight: 'bold',
                        mb: 1,
                      }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#8892B0',
                      }}
                    >
                      {feature.description}
                    </Typography>
                  </Box>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          <AnimatePresence>
            {showButton && (
              <motion.div
                variants={buttonVariants}
                initial="hidden"
                animate="visible"
                whileHover={{
                  scale: 1.05,
                  transition: {
                    duration: 0.3,
                    ease: "easeInOut"
                  }
                }}
                whileTap={{
                  scale: 0.95,
                  transition: {
                    duration: 0.1
                  }
                }}
                style={{ 
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/login')}
                  sx={{
                    backgroundColor: '#64FFDA',
                    color: '#0A192F',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    py: 1.5,
                    px: 4,
                    borderRadius: 2,
                    textTransform: 'none',
                    boxShadow: '0 4px 20px rgba(100, 255, 218, 0.3)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: '#7CFFDD',
                      boxShadow: '0 6px 25px rgba(100, 255, 218, 0.5)',
                    },
                    '&:active': {
                      backgroundColor: '#5AE6C3',
                      boxShadow: '0 2px 10px rgba(100, 255, 218, 0.3)',
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                      transform: 'translateX(-100%)',
                      borderRadius: 2,
                    },
                    '&:hover::after': {
                      transform: 'translateX(100%)',
                      transition: 'transform 0.6s ease',
                    },
                  }}
                >
                  Comenzar Ahora
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Container>

      {/* Efecto de línea en la parte inferior */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #64FFDA, transparent, #64FFDA)',
        }}
      />

      {/* Pie de página */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '1rem',
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#8892B0',
          fontSize: '0.9rem',
        }}
      >
        <Typography variant="body2">
          2025 NetFlow | Creado por Juan Billiot ft Cascade and Windsurf
        </Typography>
      </Box>
    </Box>
  );
};

export default Welcome;
