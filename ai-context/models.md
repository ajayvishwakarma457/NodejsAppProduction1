# Models

## 1. User Model

```js
{
  id: UUID,

  firstName: String,
  lastName: String,

  email: String,
  password: String,

  avatar: String,

  role: String, // admin, manager, member

  isVerified: Boolean,

  provider: String, // local, google, github
  providerId: String,

  refreshToken: String,

  lastLogin: Date,

  createdAt: Date,
  updatedAt: Date
}
```

## User Relationships

```text
User
├── belongs to many Teams
├── owns many Projects
├── assigned many Tasks
├── writes many Comments
└── receives many Notifications
```

## 2. Team Model

```js
{
  id: UUID,

  name: String,

  description: String,

  ownerId: UUID,

  createdAt: Date,
  updatedAt: Date
}
```

## Team Members Table

```js
{
  id: UUID,

  teamId: UUID,

  userId: UUID,

  role: String, // owner, admin, member

  joinedAt: Date
}
```

## 3. Project Model

```js
{
  id: UUID,

  name: String,

  description: String,

  status: String, // active, completed, archived

  ownerId: UUID,

  teamId: UUID,

  startDate: Date,
  dueDate: Date,

  createdAt: Date,
  updatedAt: Date
}
```

## Project Relationships

```text
Project
├── belongs to Team
├── created by User
└── contains many Tasks
```

## 4. Task Model

```js
{
  id: UUID,

  title: String,

  description: String,

  priority: String, // low, medium, high, critical

  status: String, // todo, in-progress, review, done

  projectId: UUID,

  createdBy: UUID,

  assignedTo: UUID,

  dueDate: Date,

  estimatedHours: Number,

  actualHours: Number,

  createdAt: Date,
  updatedAt: Date
}
```

## 5. Comment Model

```js
{
  id: UUID,

  taskId: UUID,

  userId: UUID,

  content: String,

  createdAt: Date,
  updatedAt: Date
}
```

## 6. Notification Model

```js
{
  id: UUID,

  userId: UUID,

  title: String,

  message: String,

  type: String,
  // task-assigned
  // task-updated
  // comment-added
  // project-created

  isRead: Boolean,

  createdAt: Date
}
```

## 7. Attachment Model

```js
{
  id: UUID,

  taskId: UUID,

  uploadedBy: UUID,

  fileName: String,

  fileUrl: String,

  fileSize: Number,

  mimeType: String,

  uploadedAt: Date
}
```

## 8. Refresh Token Model

```js
{
  id: UUID,

  userId: UUID,

  token: String,

  expiresAt: Date,

  createdAt: Date
}
```

## 9. Activity Log Model

```js
{
  id: UUID,

  userId: UUID,

  action: String,

  entityType: String,
  // project
  // task
  // comment

  entityId: UUID,

  metadata: JSON,

  createdAt: Date
}
```
