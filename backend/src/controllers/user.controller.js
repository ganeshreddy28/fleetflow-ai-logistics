/**
 * User Controller
 * Admin-level user management operations
 */

const { User } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

/**
 * @desc    Get all users (with pagination)
 * @route   GET /api/users
 * @access  Private/Admin
 */
const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Build query
  const query = { companyId: req.user.companyId };

  // Filter by role if specified
  if (req.query.role) {
    query.role = req.query.role;
  }

  // Filter by active status
  if (req.query.isActive !== undefined) {
    query.isActive = req.query.isActive === 'true';
  }

  // Search by name or email
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const users = await User.find(query)
    .select('-passwordHash')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * @desc    Get single user
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash');

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  // Check if same company (unless super admin)
  if (user.companyId !== req.user.companyId && req.user.role !== 'admin') {
    throw new ApiError('Not authorized to access this user', 403);
  }

  res.status(200).json({
    success: true,
    data: { user }
  });
});

/**
 * @desc    Create user (admin)
 * @route   POST /api/users
 * @access  Private/Admin
 */
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError('User with this email already exists', 400);
  }

  const user = await User.create({
    name,
    email,
    passwordHash: password,
    companyId: req.user.companyId,
    role: role || 'driver',
    phone
  });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: { user: user.profile }
  });
});

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
const updateUser = asyncHandler(async (req, res) => {
  let user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  // Check if same company
  if (user.companyId !== req.user.companyId) {
    throw new ApiError('Not authorized to update this user', 403);
  }

  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    phone: req.body.phone,
    isActive: req.body.isActive,
    preferences: req.body.preferences
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(key => 
    fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
  );

  user = await User.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: { user: user.profile }
  });
});

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  // Check if same company
  if (user.companyId !== req.user.companyId) {
    throw new ApiError('Not authorized to delete this user', 403);
  }

  // Prevent self-deletion
  if (user._id.toString() === req.user.id) {
    throw new ApiError('Cannot delete your own account', 400);
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

/**
 * @desc    Get drivers for assignment
 * @route   GET /api/users/drivers
 * @access  Private
 */
const getDrivers = asyncHandler(async (req, res) => {
  const drivers = await User.find({
    companyId: req.user.companyId,
    role: 'driver',
    isActive: true
  }).select('name email phone');

  res.status(200).json({
    success: true,
    data: { drivers }
  });
});

/**
 * @desc    Toggle user active status
 * @route   PATCH /api/users/:id/toggle-status
 * @access  Private/Admin
 */
const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  // Check if same company
  if (user.companyId !== req.user.companyId) {
    throw new ApiError('Not authorized', 403);
  }

  user.isActive = !user.isActive;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    data: { user: user.profile }
  });
});

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getDrivers,
  toggleUserStatus
};
