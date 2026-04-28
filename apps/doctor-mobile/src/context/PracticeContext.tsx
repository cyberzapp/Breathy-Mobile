import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { useBreathySounds } from '../hooks/useBreathySounds';

// ---------------------------------------------------------------------------
// PracticeContext — Native Session & Mode Management
// ---------------------------------------------------------------------------

interface PatientSession {
  id: string;
  name: string;
  phone: string;
  appointmentId: string;
  age?: string;
  gender?: string;
  startTime: string;
}

interface PracticeContextValue {
  isLiveMode: boolean;
  toggleMode: () => void;
  activePatient: PatientSession | null;
  startPatientSession: (patientData: any) => void;
  clearActivePatient: () => void;
}

const PracticeContext = createContext<PracticeContextValue | undefined>(undefined);

export const PracticeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [activePatient, setActivePatientState] = useState<PatientSession | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { playSwitchOn, playSwitchOff } = useBreathySounds();

  // Initialize from storage
  useEffect(() => {
    (async () => {
      try {
        const savedMode = await AsyncStorage.getItem('breathy_practice_mode');
        if (savedMode === 'live') setIsLiveMode(true);

        const savedPatient = await AsyncStorage.getItem('breathy_active_patient');
        if (savedPatient) {
          setActivePatientState(JSON.parse(savedPatient));
        }
      } catch (e) {
        console.error('Failed to load practice context from storage', e);
      } finally {
        setIsInitialized(true);
      }
    })();
  }, []);

  // Persist Live Mode changes
  useEffect(() => {
    if (!isInitialized) return;
    AsyncStorage.setItem('breathy_practice_mode', isLiveMode ? 'live' : 'relax').catch(console.error);
  }, [isLiveMode, isInitialized]);

  // Persist Active Patient changes
  useEffect(() => {
    if (!isInitialized) return;
    if (activePatient) {
      AsyncStorage.setItem('breathy_active_patient', JSON.stringify(activePatient)).catch(console.error);
    } else {
      AsyncStorage.removeItem('breathy_active_patient').catch(console.error);
    }
  }, [activePatient, isInitialized]);

  const toggleMode = () => {
    setIsLiveMode((prevMode) => {
      const newMode = !prevMode;
      
      if (newMode) {
        playSwitchOn();
        // Optional: you can trigger a toast/snackbar here in native if you have a library
      } else {
        playSwitchOff();
      }

      return newMode;
    });
  };

  const startPatientSession = (patientData: any) => {
    const standardizedData: PatientSession = {
      id: patientData.id || patientData.patient_id || '', 
      name: patientData.full_name || patientData.patient_name || patientData.name || 'Unknown Patient',
      phone: patientData.phone_no || patientData.phone || '', 
      appointmentId: patientData.appointment_id || patientData.id || '', 
      age: patientData.age,
      gender: patientData.gender,
      startTime: new Date().toISOString()
    };
    
    setActivePatientState(standardizedData);
  };

  const clearActivePatient = () => {
    setActivePatientState(null);
    AsyncStorage.removeItem('breathy_active_patient').catch(console.error);
  };

  return (
    <PracticeContext.Provider value={{ 
        isLiveMode, 
        toggleMode,
        activePatient, 
        startPatientSession, 
        clearActivePatient 
    }}>
      {children}
    </PracticeContext.Provider>
  );
};

export const usePracticeMode = () => {
  const context = useContext(PracticeContext);
  if (!context) {
    throw new Error('usePracticeMode must be used within a PracticeProvider');
  }
  return context;
};
