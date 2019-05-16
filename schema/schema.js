const graphql = require('graphql');
const db = require('./config');

const {
    GraphQLObjectType,
    GraphQLString,
    GraphQLSchema,
    GraphQLID,
    GraphQLList,
    GraphQLNonNull
} = graphql;

const getDataFromCollection = async (collection, id = null) => {
    let doc = null;
    doc = id ? 
        await db.collection(collection).doc(id).get() :
        await db.collection(collection).get();

    let listOfData = [];
    if(!doc.empty) 
        doc.forEach(d => listOfData.push(d.data()));

    return listOfData;
}

const getDataById = async (collection, id) => {
    const doc = await db.collection(collection).doc(id).get();
    return doc.exists ? doc.data() : null;
}

const EmployeeType = new GraphQLObjectType({
    name: 'Employee',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        parent: { 
            type: EmployeeType,
            resolve(parent, args) {
                return getDataById('employees', parent.parentId);
            }
        },
        department: {
            type: DepartmentType,
            resolve(parent, args) {
                return getDataById('departments', parent.departmentId);
            }
        }
    })
});

const DepartmentType = new GraphQLObjectType({
    name: 'Department',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        employees: {
            type: new GraphQLList(EmployeeType),
            async resolve(parent, args) {
                let employees = [];
                const snapShot = await db.collection('employees').where('departmentId', '==', parent.id).get();
                if(!snapShot.empty)
                    snapShot.forEach(x => employees.push(x.data()));
                
                return employees;
            }
        }
    })
})

const RootQuery = new GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
        employee: {
            type: EmployeeType,
            args: { id: { type: GraphQLID } },
            resolve(parent, args) {
                return getDataById('employees', args.id)
            }
        },
        employees: {
            type: new GraphQLList(EmployeeType),
            resolve(parent, args){
                return getDataFromCollection('employees');
            }
        },
        departments: {
            type: new GraphQLList(DepartmentType),
            resolve(parent, args){
                return getDataFromCollection('departments');
            }
        }
    }
});

const Mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
        addEmployee: {
            type: EmployeeType,
            args: {
                name: { type: new GraphQLNonNull(GraphQLString) },
                parentId: { type: new GraphQLNonNull(GraphQLID) },
                departmentId: { type: new GraphQLNonNull(GraphQLID) }
            },
            resolve(parent, args){ 
                const { name, parentId, departmentId } = args;
                const docRef = db.collection('employees').doc();
                const newEmployee = {
                    id: docRef.id,
                    name,
                    parentId,
                    departmentId
                }
                docRef.set(newEmployee);
                
                return newEmployee;
            }
        },
        addDepartment: {
            type: DepartmentType,
            args: {
                name: { type: new GraphQLNonNull(GraphQLString) }
            },
            resolve(parent, args) {
                const { name } = args;
                const docRef = db.collection('departments').doc();
                const newDepartment = {
                    id: docRef.id,
                    name
                }
                docRef.set(newDepartment);

                return newDepartment;
            }
        },
        deleteEmployee: {
            type: GraphQLID,
            args: { 
                id: { type: new GraphQLNonNull(GraphQLID) }
            },
            resolve(parent, args) {
                db.collection('employees').doc(args.id).delete();

                return args.id;
            }
        },
        deleteDepartment: {
            type: GraphQLID,
            args: { 
                id: { type: new GraphQLNonNull(GraphQLID) }
            },
            resolve(parent, args) {
                db.collection('departments').doc(args.id).delete();

                return args.id;
            }
        }
    }
});

module.exports = new GraphQLSchema({
    query: RootQuery,
    mutation: Mutation
});