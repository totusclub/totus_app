// API service for managing contacts

import {VOIP_BASE_URL} from '../../config/server';
import {voipFetch} from './voipAuth';

const BASE_URL = VOIP_BASE_URL;

export interface Contact {
  id: number;
  contactId: number;
  loyaltyId: string;
  name: string | null;
  fName: string | null;
  lName: string | null;
  email: string | null;
  phone: string | null;
  online: boolean;
  hasVoipToken: boolean;
  hasSocket: boolean;
  createdAt: string;
}

// Add a contact
export async function addContact(userId: number, contactLoyaltyId: string): Promise<Contact> {
  try {
    const response = await voipFetch(`${BASE_URL}/api/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        contactLoyaltyId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to add contact: ${response.status}`);
    }

    const data = await response.json();
    return data.contact;
  } catch (error) {
    console.error('Error adding contact:', error);
    throw error;
  }
}

// Get user's contacts
export async function getUserContacts(userId: number): Promise<Contact[]> {
  try {
    const response = await voipFetch(`${BASE_URL}/api/contacts/${userId}`);
    if (!response.ok) {
      // If 404, return empty array (no contacts yet)
      if (response.status === 404) {
        console.log('[contacts API] No contacts found for userId:', userId);
        return [];
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch contacts: ${response.status}`);
    }
    const data = await response.json();
    return data.contacts || [];
  } catch (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }
}

// Search user by loyalty ID
export async function searchUserByLoyaltyId(loyaltyId: string) {
  try {
    const response = await voipFetch(`${BASE_URL}/api/users/search/${loyaltyId}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to search user: ${response.status}`);
    }
    const data = await response.json();
    return data.user || null;
  } catch (error) {
    console.error('Error searching user:', error);
    throw error;
  }
}

// Check if contact already exists
export async function contactExists(userId: number, contactLoyaltyId: string): Promise<boolean> {
  try {
    const response = await voipFetch(`${BASE_URL}/api/contacts/check/${userId}/${contactLoyaltyId}`);
    if (!response.ok) {
      if (response.status === 404) {
        return false;
      }
      throw new Error(`Failed to check contact: ${response.status}`);
    }
    const data = await response.json();
    return data.exists || false;
  } catch (error) {
    console.error('Error checking contact existence:', error);
    return false;
  }
}
