import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  CardContent,
  TextField,
  Button,
  Typography,
  IconButton,
  InputAdornment,
  Link,
  CircularProgress,
  Paper,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Visibility,
  VisibilityOff,
  Waves as WavesIcon,
  ArrowBack as ArrowBackIcon,
  LockOutlined as LockIcon,
  PersonOutlined as PersonIcon,
} from '@mui/icons-material';

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    // Validación básica
    if (!formData.username || !formData.password) {
      setError('Por favor, complete todos los campos');
      return;
    }
    
    setIsLoading(true);
    
    // Simulación de autenticación
    setTimeout(() => {
      localStorage.setItem('isAuthenticated', 'true');
      navigate('/servers');
      setIsLoading(false);
    }, 1500);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    
    // Limpiar error al modificar campos
    if (error) setError('');
  };

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
        {[...Array(30)].map((_, i) => (
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
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.3
        }}
        style={{
          position: 'relative',
          width: 80,
          height: 80,
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #112240, #0A192F)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 4px 15px rgba(100, 255, 218, 0.3)',
          border: '2px solid rgba(100, 255, 218, 0.5)',
          overflow: 'hidden',
          marginBottom: '20px',
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
          <WavesIcon sx={{ fontSize: 40, color: '#64FFDA' }} />
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0A192F 0%, #112240 100%)',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <ParticleBackground />
      
      {/* Botón para volver */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{
          position: 'absolute',
          top: '2rem',
          left: '2rem',
          zIndex: 10,
        }}
      >
        <IconButton
          onClick={() => navigate('/welcome')}
          sx={{
            color: '#64FFDA',
            backgroundColor: 'rgba(10, 25, 47, 0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(100, 255, 218, 0.2)',
            '&:hover': {
              backgroundColor: 'rgba(100, 255, 218, 0.1)',
            },
          }}
        >
          <ArrowBackIcon />
        </IconButton>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        style={{ width: '100%', maxWidth: 420, zIndex: 1 }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: { xs: 3, sm: 4 },
            width: { xs: '100%', sm: '400px' },
            maxWidth: '100%',
            backgroundColor: 'rgba(17, 34, 64, 0.8)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(100, 255, 218, 0.2)',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(2, 12, 27, 0.7)',
          }}
        >
          <CardContent sx={{ p: 0 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                mb: 4,
              }}
            >
              <AnimatedLogo />
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Typography
                  variant="h4"
                  component="h1"
                  gutterBottom
                  sx={{
                    fontWeight: 700,
                    color: '#64FFDA',
                    textAlign: 'center',
                    mb: 1,
                  }}
                >
                  NetFlow
                </Typography>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{ 
                    color: '#8892B0', 
                    mb: 3, 
                    textAlign: 'center',
                    maxWidth: '280px',
                    mx: 'auto',
                  }}
                >
                  Accede a tu plataforma de monitoreo en tiempo real
                </Typography>
              </motion.div>
            </Box>

            <form onSubmit={handleSubmit}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <TextField
                  fullWidth
                  label="Usuario"
                  name="username"
                  variant="outlined"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ color: '#64FFDA', marginRight: '10px' }} />
                      </InputAdornment>
                    ),
                    sx: {
                      backgroundColor: '#112240',
                      color: '#E6F1FF',
                      '& input': {
                        paddingLeft: '8px',
                        color: '#E6F1FF',
                      }
                    }
                  }}
                  sx={{ 
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      backgroundColor: '#112240',
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(100, 255, 218, 0.3)',
                    },
                    '& .MuiInputLabel-root': {
                      color: '#8892B0',
                      backgroundColor: '#112240',
                      padding: '0 4px',
                    }
                  }}
                />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <TextField
                  fullWidth
                  label="Contraseña"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: '#64FFDA', marginRight: '10px' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: '#8892B0' }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: {
                      backgroundColor: '#112240',
                      color: '#E6F1FF',
                      '& input': {
                        paddingLeft: '8px',
                        color: '#E6F1FF',
                      }
                    }
                  }}
                  sx={{ 
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      backgroundColor: '#112240',
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(100, 255, 218, 0.3)',
                    },
                    '& .MuiInputLabel-root': {
                      color: '#8892B0',
                      backgroundColor: '#112240',
                      padding: '0 4px',
                    }
                  }}
                />
              </motion.div>
              
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <Typography 
                      color="error" 
                      variant="body2" 
                      sx={{ 
                        mb: 2, 
                        textAlign: 'center',
                        color: '#FF4444',
                      }}
                    >
                      {error}
                    </Typography>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                style={{ 
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              >
                <Box sx={{ position: 'relative' }}>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={isLoading}
                    sx={{
                      mt: 1,
                      mb: 2,
                      py: 1.5,
                      backgroundColor: 'rgba(100, 255, 218, 0.1)',
                      color: '#64FFDA',
                      borderRadius: '8px',
                      border: '1px solid #64FFDA',
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        backgroundColor: 'rgba(100, 255, 218, 0.2)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 20px rgba(100, 255, 218, 0.4)',
                      },
                      '&:disabled': {
                        color: 'rgba(100, 255, 218, 0.5)',
                        borderColor: 'rgba(100, 255, 218, 0.2)',
                      },
                    }}
                  >
                    {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  </Button>
                  {isLoading && (
                    <CircularProgress
                      size={24}
                      sx={{
                        color: '#64FFDA',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        marginTop: '-12px',
                        marginLeft: '-12px',
                      }}
                    />
                  )}
                </Box>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
              >
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => {}}
                    sx={{
                      color: '#64FFDA',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </Box>
              </motion.div>
            </form>
          </CardContent>
        </Paper>
        
        <Box
          component={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          sx={{
            mt: 2,
            textAlign: 'center',
            color: '#8892B0',
          }}
        >
          <Typography variant="body2">
            2025 NetFlow | Creado por Juan Billiot ft Cascade and Windsurf
          </Typography>
        </Box>
      </motion.div>
    </Box>
  );
};

export default Login;
