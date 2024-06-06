import { TRoleRequest } from "../dtos/auth";
import { TRole, TRoleModel } from "../models/role";

export interface IRoleRepository {
  updateOne: (role: TRoleRequest) => Promise<void>;
  updateRegistration: (role: TRoleRequest) => Promise<void>;
  findOneByName: (name: string) => Promise<TRole | null>;
  deleteOne: (name: string) => Promise<void>;
}

export class RoleRepository implements IRoleRepository {
  constructor(private roleModel: TRoleModel) {
    this.roleModel = roleModel;
  }

  async updateOne(role: TRoleRequest): Promise<void> {
    try {
      await this.roleModel.findOneAndUpdate(
        { name: role.name },
        {
          limits: role.limits,
          additions: role.additions,
          registration: role.registration,
          updated_at: new Date(),
          deleted_at: null,
        },
        { upsert: true, runValidators: false, new: true, lean: true }
      );
    } catch (error) {
      throw error;
    }
  }

  async updateRegistration(role: TRoleRequest): Promise<void> {
    try {
      await this.roleModel.updateOne(
        { name: role.name },
        {
          registration: role.registration,
          updated_at: new Date(),
        }
      );
    } catch (error) {
      throw error;
    }
  }

  async findOneByName(name: string): Promise<TRole | null> {
    try {
      const role = await this.roleModel.findOne({ name, deleted_at: null });
      return role;
    } catch (error) {
      throw error;
    }
  }

  async deleteOne(name: string): Promise<void> {
    try {
      await this.roleModel.updateOne({ name }, { deleted_at: new Date() });
    } catch (error) {
      throw error;
    }
  }
}
