import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RecentDoctor {
  id: string;
  name: string;
  specialty: string;
  viewedAt: number;
}

const RECENT_DOCTORS_KEY = '@breathy_recent_doctors';
const MAX_RECENT_DOCTORS = 5;

export const getRecentDoctors = async (): Promise<RecentDoctor[]> => {
  try {
    const data = await AsyncStorage.getItem(RECENT_DOCTORS_KEY);
    if (data) {
      return JSON.parse(data) as RecentDoctor[];
    }
  } catch (error) {
    console.error('Error fetching recent doctors:', error);
  }
  return [];
};

export const addRecentDoctor = async (doctor: RecentDoctor): Promise<void> => {
  try {
    let recent = await getRecentDoctors();
    
    // Remove if already exists to move to top
    recent = recent.filter(d => d.id !== doctor.id);
    
    // Add to top
    recent.unshift({ ...doctor, viewedAt: Date.now() });
    
    // Cap at max limit
    if (recent.length > MAX_RECENT_DOCTORS) {
      recent = recent.slice(0, MAX_RECENT_DOCTORS);
    }
    
    await AsyncStorage.setItem(RECENT_DOCTORS_KEY, JSON.stringify(recent));
  } catch (error) {
    console.error('Error saving recent doctor:', error);
  }
};
