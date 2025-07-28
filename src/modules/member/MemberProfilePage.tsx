import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, MapPin, KeyRound, Settings } from 'lucide-react';
import AddressList from '../Address/components/AddressList';
import UserChangePasswordDialog from '@/components/common/UserChangePasswordDialog';
import { useNavigate } from 'react-router-dom';

const MemberProfilePage: React.FC = () => {
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const navigate = useNavigate();

  // Get user data from localStorage
  const userData = React.useMemo(() => {
    try {
      const userDataString = localStorage.getItem('user');
      return userDataString ? JSON.parse(userDataString) : null;
    } catch (error) {
      console.error('Failed to parse user data from localStorage', error);
      return null;
    }
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">My Account</h1>
        <p className="text-gray-600 mt-1">Manage your profile, addresses, and account settings</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="addresses" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Addresses</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-base font-medium">{userData?.name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-base font-medium">{userData?.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Mobile</label>
                  <p className="text-base font-medium">{userData?.mobile || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Account Type</label>
                  <p className="text-base font-medium">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {userData?.role || 'Member'}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Member Since</label>
                  <p className="text-base font-medium">
                    {userData?.createdAt 
                      ? new Date(userData.createdAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Not available'
                    }
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-3">
                  To update your profile information, please contact our support team.
                </p>
                <Button variant="outline" onClick={() => navigate('/contact')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addresses" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Delivery Addresses
                  </CardTitle>
                  <CardDescription>
                    Manage your delivery addresses for orders and subscriptions
                  </CardDescription>
                </div>
                <Button onClick={() => navigate('/member/addresses/create')}>
                  Add New Address
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <AddressList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security and password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <h3 className="font-medium">Password</h3>
                  <p className="text-sm text-gray-600">
                    Change your account password to keep your account secure
                  </p>
                </div>
                <Button 
                  onClick={() => setIsChangePasswordDialogOpen(true)}
                  variant="outline"
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div className="space-y-1">
                  <h3 className="font-medium">Account Security</h3>
                  <p className="text-sm text-gray-600">
                    Your account is protected with secure authentication
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700">Secure</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Change Password Dialog */}
      <UserChangePasswordDialog
        isOpen={isChangePasswordDialogOpen}
        onClose={() => setIsChangePasswordDialogOpen(false)}
      />
    </div>
  );
};

export default MemberProfilePage;