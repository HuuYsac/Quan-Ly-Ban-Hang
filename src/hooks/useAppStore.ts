import { useState, useEffect } from 'react';
import { AppData, Customer, Supplier, Product, Category, Order, ShopInfo, Settings, CSKHSettings, NotificationSettings, WarrantyNotification } from '../types';
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
  getDocs,
  limit
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, user?: User | null) {
  const currentUser = user || auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

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
    if (!user) {
      setData(initialData);
      setLoading(false);
      return;
    }

    setLoading(true);
    const userRef = doc(db, 'users', user.uid);

    const unsubscribers: (() => void)[] = [];
    const clearUnsubscribers = () => {
      unsubscribers.forEach(unsub => unsub());
      unsubscribers.length = 0;
    };

    const syncCollection = (name: string, key: keyof AppData) => {
      const colRef = collection(db, name);
      const unsub = onSnapshot(colRef, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setData(prev => ({ ...prev, [key]: items }));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, name, user);
      });
      unsubscribers.push(unsub);
    };

    const startSyncing = (isAdminUser: boolean) => {
      clearUnsubscribers();
      
      if (isAdminUser) {
        const usersRef = collection(db, 'users');
        const usersUnsubscribe = onSnapshot(usersRef, (snapshot) => {
          const users = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as any));
          setData(prev => ({ ...prev, users }));
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'users', user);
        });
        unsubscribers.push(usersUnsubscribe);
      }

      const collectionsToSync: [string, keyof AppData][] = [
        ['customers', 'customers'],
        ['suppliers', 'suppliers'],
        ['products', 'products'],
        ['categories', 'categories'],
        ['orders', 'orders'],
        ['repairs', 'repairs'],
        ['leads', 'leads'],
        ['careTasks', 'careTasks'],
        ['sales', 'sales'],
        ['warrantyNotifications', 'warrantyNotifications'],
        ['promotions', 'promotions']
      ];

      collectionsToSync.forEach(([name, key]) => syncCollection(name, key));

      // Shared config
      unsubscribers.push(onSnapshot(doc(db, 'config', 'shopInfo'), (doc) => {
        if (doc.exists()) setData(prev => ({ ...prev, shopInfo: doc.data() as ShopInfo }));
      }));

      unsubscribers.push(onSnapshot(doc(db, 'config', 'settings'), (doc) => {
        if (doc.exists()) setData(prev => ({ ...prev, settings: doc.data() as Settings }));
        setLoading(false);
      }));

      unsubscribers.push(onSnapshot(doc(db, 'config', 'cskhSettings'), (doc) => {
        if (doc.exists()) setData(prev => ({ ...prev, cskhSettings: doc.data() as CSKHSettings }));
      }));

      unsubscribers.push(onSnapshot(doc(db, 'config', 'notificationSettings'), (doc) => {
        if (doc.exists()) setData(prev => ({ ...prev, notificationSettings: doc.data() as NotificationSettings }));
      }));
    };

    // First, listen to the user's own document to handle approval changes in real-time
    const unsubUser = onSnapshot(userRef, async (docSnap) => {
      if (!docSnap.exists()) {
        // Seed if not exists
        const ownerEmail = 'dieuhuu1995@gmail.com';
        const isOwner = user.email === ownerEmail;
        try {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            phone: user.phoneNumber || '00000000',
            role: isOwner ? 'admin' : 'user',
            position: isOwner ? 'Quản trị viên hệ thống' : '',
            approved: isOwner,
            createdAt: new Date().toISOString()
          });
          
          if (isOwner) {
            const shopInfoSnap = await getDoc(doc(db, 'config', 'shopInfo'));
            if (!shopInfoSnap.exists()) {
              const seedBatch = writeBatch(db);
              seedBatch.set(doc(db, 'config', 'shopInfo'), initialData.shopInfo);
              seedBatch.set(doc(db, 'config', 'settings'), initialData.settings);
              seedBatch.set(doc(db, 'config', 'cskhSettings'), { milestone1: 7, milestone2: 3, milestone3: 6 });
              seedBatch.set(doc(db, 'config', 'notificationSettings'), {
                zaloAccessToken: '', zaloOaId: '', smsApiKey: '', smsProvider: 'esms',
                autoSendWarranty: false, daysBeforeExpiry: 7,
                messageTemplate: 'Chào {customerName}, sản phẩm {productName} (S/N: {serviceTag}) của bạn sắp hết hạn bảo hành vào ngày {expiryDate}. Vui lòng liên hệ chúng tôi để được hỗ trợ.'
              });
              await seedBatch.commit();
            }
          }
        } catch (error) {
          console.error('Error seeding user:', error);
        }
        return;
      }

      const userData = docSnap.data();
      const approved = userData?.approved === true;
      const isAdminUser = user.email === 'dieuhuu1995@gmail.com' || userData?.role === 'admin';

      if (!approved && user.email !== 'dieuhuu1995@gmail.com') {
        clearUnsubscribers();
        setData(initialData);
        setLoading(false);
        return;
      }

      // Start syncing other collections if approved
      startSyncing(isAdminUser);
    });

    return () => {
      unsubUser();
      clearUnsubscribers();
    };
  }, [user]);

  const updateData = async (newData: Partial<AppData>) => {
    if (!user) return;

    try {
      // Handle shopInfo and settings which are single docs
      if (newData.shopInfo) {
        await setDoc(doc(db, 'config', 'shopInfo'), newData.shopInfo, { merge: true });
      }
      if (newData.settings) {
        await setDoc(doc(db, 'config', 'settings'), newData.settings, { merge: true });
      }
      if (newData.cskhSettings) {
        await setDoc(doc(db, 'config', 'cskhSettings'), newData.cskhSettings, { merge: true });
      }
      if (newData.notificationSettings) {
        await setDoc(doc(db, 'config', 'notificationSettings'), newData.notificationSettings, { merge: true });
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
            const itemRef = doc(db, collectionName, item.id);
            batch.set(itemRef, item);
          });
          
          // Delete removed items
          deletedItems.forEach(item => {
            const itemRef = doc(db, collectionName, item.id);
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
      await syncCollection('leads', 'leads');
      await syncCollection('careTasks', 'careTasks');
      await syncCollection('sales', 'sales');
      await syncCollection('warrantyNotifications', 'warrantyNotifications');
      await syncCollection('promotions', 'promotions');

    } catch (error) {
      console.error('Error updating data:', error);
    }
  };

  // Add more granular update methods
  const addItem = async (collectionName: string, item: any) => {
    if (!user) return;
    try {
      await setDoc(doc(db, collectionName, item.id), item);
    } catch (error) {
      console.error(`Error adding item to ${collectionName}:`, error);
      throw error;
    }
  };

  const updateItem = async (collectionName: string, id: string, item: any) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, collectionName, id), item);
    } catch (error) {
      console.error(`Error updating item in ${collectionName}:`, error);
      throw error;
    }
  };

  const deleteItem = async (collectionName: string, id: string) => {
    if (!user) return;
    try {
      const itemRef = doc(db, collectionName, id);
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(itemRef);
    } catch (error) {
      console.error(`Error deleting item from ${collectionName}:`, error);
      throw error;
    }
  };

  const resetDatabase = async () => {
    if (!user) return;
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const isAdmin = user.email === 'dieuhuu1995@gmail.com' || user.email === 'huulaptop.info@gmail.com' || userDoc.data()?.role === 'admin';
    
    if (!isAdmin) return;
    
    setLoading(true);
    try {
      const collections = [
        'customers', 'suppliers', 'products', 'categories', 'orders', 
        'repairs', 'leads', 'careTasks', 'sales', 'warrantyNotifications', 'promotions'
      ];

      for (const colName of collections) {
        const querySnapshot = await getDocs(collection(db, colName));
        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }

      // Also clear users except admins
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userBatch = writeBatch(db);
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        const isProtected = userData.email === 'dieuhuu1995@gmail.com' || 
                            userData.email === 'huulaptop.info@gmail.com' || 
                            userData.role === 'admin';
        if (!isProtected) {
          userBatch.delete(doc.ref);
        }
      });
      await userBatch.commit();

      // Re-seed with blank data
      const seedBatch = writeBatch(db);
      
      seedBatch.set(doc(db, 'config', 'shopInfo'), initialData.shopInfo);
      seedBatch.set(doc(db, 'config', 'settings'), initialData.settings);
      seedBatch.set(doc(db, 'config', 'cskhSettings'), { milestone1: 7, milestone2: 3, milestone3: 6 });
      seedBatch.set(doc(db, 'config', 'notificationSettings'), {
        zaloAccessToken: '', zaloOaId: '', smsApiKey: '', smsProvider: 'esms',
        autoSendWarranty: false, daysBeforeExpiry: 7,
        messageTemplate: 'Chào {customerName}, sản phẩm {productName} (S/N: {serviceTag}) của bạn sắp hết hạn bảo hành vào ngày {expiryDate}. Vui lòng liên hệ chúng tôi để được hỗ trợ.'
      });
      
      await seedBatch.commit();
      console.log('Database reset successfully to blank state');
    } catch (error) {
      console.error('Error resetting database:', error);
    } finally {
      setLoading(false);
    }
  };

  return { data, updateData, loading, addItem, updateItem, deleteItem, resetDatabase };
}
