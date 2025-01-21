import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UserDetails {
  id: string;
  role: 'basic' | 'premium' | 'admin';
  account_status: 'pending' | 'active' | 'restricted' | 'suspended';
  first_name: string | null;
  last_name: string | null;
  email?: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      const { data: accountDetails, error: detailsError } = await supabase
        .from('account_details')
        .select('*');
      if (detailsError) throw detailsError;

      const combinedUsers = authUsers.map(authUser => ({
        ...accountDetails?.find(details => details.id === authUser.id),
        email: authUser.email,
        id: authUser.id,
      }));

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error fetching users",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'basic' | 'premium' | 'admin') => {
    try {
      const { error } = await supabase
        .from('account_details')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Role updated",
        description: "User role has been updated successfully",
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error updating role",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const updateAccountStatus = async (userId: string, newStatus: 'pending' | 'active' | 'restricted' | 'suspended') => {
    try {
      const { error } = await supabase
        .from('account_details')
        .update({ account_status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: "Account status has been updated successfully",
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating account status:', error);
      toast({
        title: "Error updating status",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  if (!isAdmin()) {
    return null;
  }

  if (loading) {
    return <div>Loading user management...</div>;
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">User Management</h2>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <div>{user.email}</div>
                    <div className="text-sm text-muted-foreground">
                      {user.first_name} {user.last_name}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    defaultValue={user.role}
                    onValueChange={(value: 'basic' | 'premium' | 'admin') => 
                      updateUserRole(user.id, value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    defaultValue={user.account_status}
                    onValueChange={(value: 'pending' | 'active' | 'restricted' | 'suspended') => 
                      updateAccountStatus(user.id, value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="restricted">Restricted</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.role === 'premium' ? 'premium' : 'default'}
                  >
                    {user.role}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default UserManagement;