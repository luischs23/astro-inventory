import { Button } from "../components/ui/Button"
import { Card, CardContent } from "../components/ui/Card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/DropdownMenu"
import { Trash2, MoreHorizontal, RefreshCcw } from 'lucide-react'

interface DeletedUser {
  id: string
  name: string
  email: string
  photo: string
  role: string
}

interface DeletedUsersViewProps {
  users: DeletedUser[]
  onRestore: (userId: string) => void
  onDelete: (userId: string) => Promise<void>
}

export function DeletedUsersView({ users, onRestore, onDelete }: DeletedUsersViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {users.map(user => (
        <Card key={user.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10">
                  {user.photo ? (
                    <img
                      src={user.photo || "/placeholder.svg"}
                      alt={`${user.name}`}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {/* <UserIcon className="w-6 h-6 text-primary" /> */}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{user.name}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <p className="text-sm text-primary">{user.role}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onRestore(user.id)}>
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(user.id)} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Permanently
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}