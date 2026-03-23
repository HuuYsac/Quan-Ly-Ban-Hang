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
    if (!user) return;

    setLoading(true);
    const userRef = doc(db, 'users', user.uid);

    // Check if user data exists, if not, seed it
    const checkAndSeed = async () => {
      const docSnap = await getDoc(userRef);
      let approved = false;
      const ownerEmail = 'dieuhuu1995@gmail.com';
      const isOwner = user.email === ownerEmail;

      if (!docSnap.exists()) {
        // New user, create profile
        try {
          const batch = writeBatch(db);
          
          batch.set(userRef, {
            uid: user.uid,
            email: user.email,
            phone: user.phoneNumber || '00000000',
            role: isOwner ? 'admin' : 'user',
            position: isOwner ? 'Quản trị viên hệ thống' : '',
            approved: isOwner,
            createdAt: new Date().toISOString()
          });

          await batch.commit();
          approved = isOwner;

          // If owner, seed shared collections if they are empty
          if (isOwner) {
            const customersSnap = await getDocs(query(collection(db, 'customers'), limit(1)));
            if (customersSnap.empty) {
              const seedBatch = writeBatch(db);
              
              initialData.customers.forEach(c => seedBatch.set(doc(db, 'customers', c.id), c));
              initialData.suppliers.forEach(s => seedBatch.set(doc(db, 'suppliers', s.id), s));
              initialData.products.forEach(p => seedBatch.set(doc(db, 'products', p.id), p));
              initialData.categories.forEach(cat => seedBatch.set(doc(db, 'categories', cat.id), cat));
              initialData.orders.forEach(o => seedBatch.set(doc(db, 'orders', o.id), o));
              initialData.repairs.forEach(r => seedBatch.set(doc(db, 'repairs', r.id), r));
              initialData.leads.forEach(l => seedBatch.set(doc(db, 'leads', l.id), l));
              initialData.careTasks.forEach(ct => seedBatch.set(doc(db, 'careTasks', ct.id), ct));
              initialData.sales.forEach(s => seedBatch.set(doc(db, 'sales', s.id), s));
              initialData.promotions.forEach(p => seedBatch.set(doc(db, 'promotions', p.id), p));
              
              seedBatch.set(doc(db, 'config', 'shopInfo'), initialData.shopInfo);
              seedBatch.set(doc(db, 'config', 'settings'), initialData.settings);
              seedBatch.set(doc(db, 'config', 'cskhSettings'), {
                milestone1: 7,
                milestone2: 3,
                milestone3: 6
              });
              seedBatch.set(doc(db, 'config', 'notificationSettings'), {
                zaloAccessToken: '',
                zaloOaId: '',
                smsApiKey: '',
                smsProvider: 'esms',
                autoSendWarranty: false,
                daysBeforeExpiry: 7,
                messageTemplate: 'Chào {customerName}, sản phẩm {productName} (S/N: {serviceTag}) của bạn sắp hết hạn bảo hành vào ngày {expiryDate}. Vui lòng liên hệ chúng tôi để được hỗ trợ.'
              });
              
              await seedBatch.commit();
            }
          }
        } catch (error) {
          console.error('Error seeding data:', error);
        }
      } else {
        approved = docSnap.data()?.approved === true;
      }
      return approved;
    };

    const startSync = async () => {
      const approved = await checkAndSeed();
      if (!approved && user.email !== 'dieuhuu1995@gmail.com') {
        setLoading(false);
        return [];
      }
      
      // Listen to collections
      const unsubscribers: (() => void)[] = [];

      // Sync users collection for admins
      const ownerEmail = 'dieuhuu1995@gmail.com';
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      const isAdminUser = user.email === ownerEmail || userData?.role === 'admin';

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

      const syncCollection = (name: string, key: keyof AppData) => {
        const colRef = collection(db, name);
        const unsub = onSnapshot(colRef, (snapshot) => {
          const items = snapshot.docs.map(doc => doc.data());
          setData(prev => ({ ...prev, [key]: items }));
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, name, user);
        });
        unsubscribers.push(unsub);
      };

      syncCollection('customers', 'customers');
      syncCollection('suppliers', 'suppliers');
      syncCollection('products', 'products');
      syncCollection('categories', 'categories');
      syncCollection('orders', 'orders');
      syncCollection('repairs', 'repairs');
      syncCollection('leads', 'leads');
      syncCollection('careTasks', 'careTasks');
      syncCollection('sales', 'sales');
      syncCollection('warrantyNotifications', 'warrantyNotifications');
      syncCollection('promotions', 'promotions');

      // Listen to shared config
      const unsubShop = onSnapshot(doc(db, 'config', 'shopInfo'), (doc) => {
        if (doc.exists()) {
          setData(prev => ({ ...prev, shopInfo: doc.data() as ShopInfo }));
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'config/shopInfo', user);
      });
      unsubscribers.push(unsubShop);

      const unsubSettings = onSnapshot(doc(db, 'config', 'settings'), (doc) => {
        if (doc.exists()) {
          setData(prev => ({ ...prev, settings: doc.data() as Settings }));
        }
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'config/settings', user);
        setLoading(false);
      });
      unsubscribers.push(unsubSettings);

      const unsubCSKH = onSnapshot(doc(db, 'config', 'cskhSettings'), (doc) => {
        if (doc.exists()) {
          setData(prev => ({ ...prev, cskhSettings: doc.data() as CSKHSettings }));
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'config/cskhSettings', user);
      });
      unsubscribers.push(unsubCSKH);

      const unsubNotify = onSnapshot(doc(db, 'config', 'notificationSettings'), (doc) => {
        if (doc.exists()) {
          setData(prev => ({ ...prev, notificationSettings: doc.data() as NotificationSettings }));
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'config/notificationSettings', user);
      });
      unsubscribers.push(unsubNotify);

      return unsubscribers;
    };

    let isMounted = true;
    let currentUnsubscribers: (() => void)[] = [];

    startSync().then(unsubs => {
      if (!isMounted) {
        unsubs.forEach(unsub => unsub());
        return;
      }
      currentUnsubscribers = unsubs;
    });

    return () => {
      isMounted = false;
      currentUnsubscribers.forEach(unsub => unsub());
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
    await setDoc(doc(db, collectionName, item.id), item);
  };

  const updateItem = async (collectionName: string, id: string, item: any) => {
    if (!user) return;
    await updateDoc(doc(db, collectionName, id), item);
  };

  const deleteItem = async (collectionName: string, id: string) => {
    if (!user) return;
    const itemRef = doc(db, collectionName, id);
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(itemRef);
  };

  return { data, updateData, loading, addItem, updateItem, deleteItem };
}
