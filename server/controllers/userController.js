import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';

// GET /api/users/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/users/profile
export const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const updateData = {};
    if (name) updateData.name = name;

    if (req.file) {
      // multer-storage-cloudinary puts the CDN url in req.file.path
      const user = await User.findById(req.user._id);
      if (user.avatar) {
        const publicId = user.avatar.split('/').slice(-1)[0].split('.')[0];
        await cloudinary.uploader.destroy(`intellmeet/avatars/${publicId}`);
      }
      updateData.avatar = req.file.path;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Profile updated',
      // reshaped like login/signup's {id, ...} — raw doc has _id, would break every
      // user.id check (host, "is me", etc.) after an edit
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/users/avatar
export const deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.avatar) {
      const publicId = user.avatar.split('/').slice(-1)[0].split('.')[0];
      await cloudinary.uploader.destroy(`intellmeet/avatars/${publicId}`);
      await User.findByIdAndUpdate(req.user._id, { avatar: '' });
    }
    res.status(200).json({ message: 'Avatar removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};