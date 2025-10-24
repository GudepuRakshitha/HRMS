import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    IconButton,
    InputAdornment,
    Divider,
    Slider
} from '@mui/material';
import {
    Close as CloseIcon,
    AccessTime,
    Business,
    Save as SaveIcon
} from '@mui/icons-material';

function SettingsModal({ open, onClose, user }) {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Load settings from backend
    const loadSettings = async () => {
        const API_BASE = import.meta.env.VITE_API_URL;
        try {
            setLoading(true);
            console.log('🔄 Loading settings from backend...');
            
            if (!user || !user.id) {
                console.log('❌ No user found, using defaults');
                setSettings({
                    dailyHours: 8,
                    startTime: '09:00',
                    endTime: '17:00'
                });
                return;
            }

            // Call backend GET settings endpoint using VITE_API_URL
            const response = await fetch(`${API_BASE}/api/tracking/settings`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Settings loaded from backend:', data);
                
                setSettings({
                    dailyHours: data.dailyHours || 8,
                    startTime: data.startTime || '09:00',
                    endTime: data.endTime || '17:00'
                });
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Failed to load settings:', error);
            // Use defaults only on error
            setSettings({
                dailyHours: 8,
                startTime: '09:00',
                endTime: '17:00'
            });
        } finally {
            setLoading(false);
        }
    };

    // Save settings to backend
    const saveSettings = async () => {
        const API_BASE = import.meta.env.VITE_API_URL;
        setSaving(true);
        try {
            // Get current user ID
            const currentUser = JSON.parse(localStorage.getItem('user'));
            const userId = currentUser?.id;
            
            if (!userId) {
                alert('User not found. Please log in again.');
                setSaving(false);
                return;
            }

            // Save settings with requestingUserId parameter
            const response = await fetch(`${API_BASE}/api/tracking/settings?requestingUserId=${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings),
            });

            if (response.ok) {
                // Automatically update target hours for existing records
                try {
                    const updateResponse = await fetch(`${API_BASE}/api/tracking/update-target-hours`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            newTargetHours: settings.dailyHours,
                            employeeId: userId,
                            effectiveDate: new Date().toISOString().split('T')[0] // Today
                        }),
                    });

                    if (updateResponse.ok) {
                        const updateResult = await updateResponse.json();
                        console.log('✅ Updated target hours for', updateResult.updated, 'records');
                    } else {
                        console.warn('⚠️ Settings saved but target hours update failed');
                    }
                } catch (updateError) {
                    console.warn('⚠️ Settings saved but target hours update failed:', updateError);
                }

                // Close modal after successful save
                setTimeout(() => {
                    onClose();
                }, 500);
            }
        } catch (error) {
            alert('Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    // Load settings on mount
    useEffect(() => {
        if (open) {
            loadSettings();
        }
    }, [open]);

    if (!open) return null;

    if (loading || !settings) {
        return (
            <Dialog open={open} maxWidth="sm" fullWidth>
                <DialogContent sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h6" gutterBottom>Loading Settings...</Typography>
                    <Typography variant="body2" color="text.secondary">Please wait</Typography>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: '12px' } }}
        >
            <DialogTitle sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                pb: 1
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTime color="primary" />
                    <Typography variant="h6">Time Settings</Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <Divider />

            <DialogContent sx={{ pt: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Daily Hours */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                            Daily Target Hours
                        </Typography>
                        <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            mb: 2 
                        }}>
                            <Typography variant="body2" color="text.secondary">
                                Work Hours
                            </Typography>
                            <Box sx={{
                                backgroundColor: '#f0f9ff',
                                color: '#0369a1',
                                padding: '4px 12px',
                                borderRadius: '16px',
                                fontSize: '14px',
                                fontWeight: '600'
                            }}>
                                {settings.dailyHours}h per day
                            </Box>
                        </Box>
                        
                        <Slider
                            value={settings.dailyHours}
                            onChange={(e, value) => setSettings({...settings, dailyHours: value})}
                            min={4}
                            max={12}
                            step={0.5}
                            marks={[
                                { value: 4, label: '4h' },
                                { value: 6, label: '6h' },
                                { value: 8, label: '8h' },
                                { value: 10, label: '10h' },
                                { value: 12, label: '12h' }
                            ]}
                            sx={{
                                color: '#3b82f6',
                                '& .MuiSlider-thumb': {
                                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
                                }
                            }}
                        />
                        
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Employees will need to work <strong>{settings.dailyHours} hours</strong> to achieve full day attendance
                        </Typography>
                    </Box>

                    {/* Work Hours */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                            <Business sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                            Office Hours
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <TextField
                                type="time"
                                value={settings.startTime}
                                onChange={(e) => setSettings({...settings, startTime: e.target.value})}
                                size="small"
                                sx={{ flex: 1 }}
                                InputLabelProps={{ shrink: true }}
                            />
                            <Typography variant="body2" color="text.secondary">to</Typography>
                            <TextField
                                type="time"
                                value={settings.endTime}
                                onChange={(e) => setSettings({...settings, endTime: e.target.value})}
                                size="small"
                                sx={{ flex: 1 }}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            Clock-in restricted to {settings.startTime} - {settings.endTime}
                        </Typography>
                    </Box>

                    {/* Idle Detection Info */}
                    <Box sx={{
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '8px',
                        p: 2
                    }}>
                        <Typography variant="subtitle2" color="#1e40af" gutterBottom>
                            Idle Detection: 5 Minutes (Fixed)
                        </Typography>
                        <Typography variant="caption" color="#1e40af">
                            Timer automatically pauses when users are inactive for 5 minutes. This follows industry best practices.
                        </Typography>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2.5, pt: 1 }}>
                <Button onClick={onClose} color="inherit" variant="outlined">
                    Cancel
                </Button>
                <Button
                    onClick={saveSettings}
                    disabled={saving}
                    variant="contained"
                    startIcon={saving ? null : <SaveIcon />}
                    sx={{ minWidth: '120px' }}
                >
                    {saving ? 'Saving...' : 'Save Settings'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default SettingsModal;