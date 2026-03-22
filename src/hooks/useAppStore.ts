import { useState, useEffect } from 'react';
import { AppData, Customer, Supplier, Product, Category, Order, ShopInfo, Settings, CSKHSettings } from '../types';
import { initialData } from '../data/mockData';
import { db, auth } from '../firebase';
import { 
  doc, 
  collection, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  getDoc,
  writeBatch,
  query,
  getDocs
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

export function useAppStore() {
  const [data, setData] = useState<AppData>(initialData);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setData(initialData);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const userRef = doc(db, 'users', user.uid);

    // Check if user data exists, if not, seed it
    const checkAndSeed = async () => {
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) {
        // New user, seed with initial data
        try {
          const batch = writeBatch(db);
          
          // Seed collections
          initialData.customers.forEach(c => {
            batch.set(doc(db, 'users', user.uid, 'customers', c.id), c);
          });
          initialData.suppliers.forEach(s => {
            batch.set(doc(db, 'users', user.uid, 'suppliers', s.id), s);
          });
          initialData.products.forEach(p => {
            batch.set(doc(db, 'users', user.uid, 'products', p.id), p);
          });
          initialData.categories.forEach(cat => {
            batch.set(doc(db, 'users', user.uid, 'categories', cat.id), cat);
          });
          initialData.orders.forEach(o => {
            batch.set(doc(db, 'users', user.uid, 'orders', o.id), o);
          });
          
          // Seed config
          batch.set(doc(db, 'users', user.uid, 'config', 'shopInfo'), initialData.shopInfo);
          batch.set(doc(db, 'users', user.uid, 'config', 'settings'), initialData.settings);
          batch.set(doc(db, 'users', user.uid, 'config', 'cskhSettings'), {
            milestone1: 7,
            milestone2: 3,
            milestone3: 6
          });
          
          // Create user profile
          batch.set(userRef, {
            uid: user.uid,
            email: user.email,
            createdAt: new Date().toISOString()
          });

          await batch.commit();
        } catch (error) {
          console.error('Error seeding data:', error);
        }
      }
    };

    checkAndSeed();

    // Listen to collections
    const unsubscribers: (() => void)[] = [];

    const syncCollection = (name: string, key: keyof AppData) => {
      const colRef = collection(db, 'users', user.uid, name);
      const unsub = onSnapshot(colRef, (snapshot) => {
        const items = snapshot.docs.map(doc => doc.data());
        setData(prev => ({ ...prev, [key]: items }));
      });
      unsubscribers.push(unsub);
    };

    syncCollection('customers', 'customers');
    syncCollection('suppliers', 'suppliers');
    syncCollection('products', 'products');
    syncCollection('categories', 'categories');
    syncCollection('orders', 'orders');
    syncCollection('repairs', 'repairs');

    // Listen to config
    const unsubShop = onSnapshot(doc(db, 'users', user.uid, 'config', 'shopInfo'), (doc) => {
      if (doc.exists()) {
        setData(prev => ({ ...prev, shopInfo: doc.data() as ShopInfo }));
      }
    });
    unsubscribers.push(unsubShop);

    const unsubSettings = onSnapshot(doc(db, 'users', user.uid, 'config', 'settings'), (doc) => {
      if (doc.exists()) {
        setData(prev => ({ ...prev, settings: doc.data() as Settings }));
      }
      setLoading(false);
    });
    unsubscribers.push(unsubSettings);

    const unsubCSKH = onSnapshot(doc(db, 'users', user.uid, 'config', 'cskhSettings'), (doc) => {
      if (doc.exists()) {
        setData(prev => ({ ...prev, cskhSettings: doc.data() as CSKHSettings }));
      }
    });
    unsubscribers.push(unsubCSKH);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user]);

  const updateData = async (newData: Partial<AppData>) => {
    if (!user) return;

    try {
      // Handle shopInfo and settings which are single docs
      if (newData.shopInfo) {
        await setDoc(doc(db, 'users', user.uid, 'config', 'shopInfo'), newData.shopInfo, { merge: true });
      }
      if (newData.settings) {
        await setDoc(doc(db, 'users', user.uid, 'config', 'settings'), newData.settings, { merge: true });
      }
      if (newData.cskhSettings) {
        await setDoc(doc(db, 'users', user.uid, 'config', 'cskhSettings'), newData.cskhSettings, { merge: true });
      }

      // Handle collections
      const syncCollection = async (key: keyof AppData, collectionName: string) => {
        if (newData[key] && Array.isArray(newData[key])) {
          const newItems = newData[key] as any[];
          const currentItems = data[key] as any[];
          
          // Find deleted items
          const newIds = new Set(newItems.map(item => item.id));
          const deletedItems = currentItems.filter(item => !newIds.has(item.id));
          
          const batch = writeBatch(db);
          
          // Set/Update new and existing items
          newItems.forEach(item => {
            const itemRef = doc(db, 'users', user.uid, collectionName, item.id);
            batch.set(itemRef, item);
          });
          
          // Delete removed items
          deletedItems.forEach(item => {
            const itemRef = doc(db, 'users', user.uid, collectionName, item.id);
            batch.delete(itemRef);
          });
          
          await batch.commit();
        }
      };

      await syncCollection('customers', 'customers');
      await syncCollection('suppliers', 'suppliers');
      await syncCollection('products', 'products');
      await syncCollection('categories', 'categories');
      await syncCollection('orders', 'orders');
      await syncCollection('repairs', 'repairs');

    } catch (error) {
      console.error('Error updating data:', error);
    }
  };

  // Add more granular update methods
  const addItem = async (collectionName: string, item: any) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, collectionName, item.id), item);
  };

  const updateItem = async (collectionName: string, id: string, item: any) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, collectionName, id), item);
  };

  const deleteItem = async (collectionName: string, id: string) => {
    if (!user) return;
    const itemRef = doc(db, 'users', user.uid, collectionName, id);
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(itemRef);
  };

  return { data, updateData, loading, addItem, updateItem, deleteItem };
}
