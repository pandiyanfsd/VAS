const { Admin } = require('../models/admin');

const createSuperAdmin = async () => {
  try {
    // Check if any admin exists
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const superAdmin = new Admin({
        name: 'superadmin',
        password: 'password123', // In production, this should be hashed
        role: 'admin'
      });
      await superAdmin.save();
      console.log('🌟 Super Admin created automatically:');
      console.log('   Username: superadmin');
      console.log('   Password: password123');
    }
  } catch (error) {
    console.error('❌ Failed to create Super Admin:', error.message);
  }
};

module.exports = { createSuperAdmin };
